import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isNone } from '@ember/utils';
import { task } from 'ember-concurrency';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';
import noop from '../utils/noop';

export default class ChatTrayComponent extends Component {
    @service chat;
    @service socket;
    @service fetch;
    @service store;
    @service modalsManager;
    @service currentUser;
    @service media;
    @tracked channels = [];
    @tracked unreadCount = 0;
    @tracked notificationSound = new Audio('/sounds/message-notification-sound.mp3');

    constructor() {
        super(...arguments);
        this.chat.loadChannels.perform({
            withChannels: (channels) => {
                this.channels = channels;
                this.countUnread(channels);
                this.listenAllChatChannels(channels);
                this.listenUserChannel();
            },
        });
    }

    /**
     * Calculate dropdown content position.
     *
     * @param {HTMLElement} trigger
     * @param {HTMLElement} content
     * @return {Object}
     * @memberof ChatTrayComponent
     */
    @action calculatePosition(trigger, content) {
        if (this.media.isMobile) {
            content.classList.add('is-mobile');
            const triggerRect = trigger.getBoundingClientRect();
            const top = triggerRect.height + triggerRect.top;

            return { style: { left: '0px', right: '0px', top, width: '100%' } };
        }

        return calculatePosition(...arguments);
    }

    willDestroy() {
        this.chat.off('chat.feed_updated', this.reloadChannelWithDelay.bind(this));
        super.willDestroy(...arguments);
    }

    listenAllChatChannels(channels) {
        channels.forEach((chatChannelRecord) => {
            this.listenChatChannel(chatChannelRecord);
        });
    }

    async listenUserChannel() {
        this.socket.listen(`user.${this.currentUser.id}`, (socketEvent) => {
            const { event, data } = socketEvent;
            switch (event) {
                case 'chat.participant_added':
                case 'chat_participant.created':
                    this.reloadChannels();
                    break;
                case 'chat.participant_removed':
                case 'chat_participant.deleted':
                    this.reloadChannels();
                    this.closeChannelIfRemovedFromParticipants(data);
                    break;
                case 'chat_channel.created':
                    this.reloadChannels({ relisten: true });
                    this.openNewChannelAsParticipant(data);
                    break;
                case 'chat_channel.deleted':
                    this.reloadChannels({ relisten: true });
                    this.closeChannelIfOpen(data);
                    break;
            }
        });
    }

    async listenChatChannel(chatChannelRecord) {
        this.socket.listen(`chat.${chatChannelRecord.public_id}`, (socketEvent) => {
            const { event, data } = socketEvent;
            switch (event) {
                case 'chat_message.created':
                    this.reloadChannels();
                    this.playSoundForIncomingMessage(chatChannelRecord, data);
                    break;
                case 'chat.added_participant':
                    this.reloadChannels();
                    break;
                case 'chat_participant.deleted':
                case 'chat.removed_participant':
                    this.reloadChannels();
                    this.closeChannelIfRemovedFromParticipants(data);
                    break;
                case 'chat_channel.created':
                    this.reloadChannels({ relisten: true });
                    this.openNewChannelAsParticipant(data);
                    break;
                case 'chat_channel.deleted':
                    this.reloadChannels({ relisten: true });
                    this.closeChannelIfOpen(data);
                    break;
                case 'chat_receipt.created':
                    this.reloadChannels({ relisten: true });
                    break;
            }
        });
    }

    @action openChannel(chatChannelRecord) {
        this.chat.openChannel(chatChannelRecord);
        this.reloadChannels({ relisten: true });
    }

    @action startChat() {
        this.chat.createChatChannel('Untitled Chat').then((chatChannelRecord) => {
            this.openChannel(chatChannelRecord);
        });
    }

    @action removeChannel(chatChannelRecord) {
        this.modalsManager.confirm({
            title: `Are you sure you wish to end this chat (${chatChannelRecord.title})?`,
            body: 'Once this chat is ended, it will no longer be accessible for anyone.',
            confirm: (modal) => {
                modal.startLoading();

                this.chat.closeChannel(chatChannelRecord);
                this.chat.deleteChatChannel(chatChannelRecord);
                return this.reloadChannels();
            },
        });
    }

    @action updateChatChannel(chatChannelRecord) {
        this.chat.deleteChatChannel(chatChannelRecord);
        this.reloadChannels();
    }

    @action async unlockAudio() {
        this.reloadChannels();
        try {
            this.notificationSound.play().catch(noop);
            this.notificationSound.pause();
            this.notificationSound.currentTime = 0;
        } catch (error) {
            noop();
        }
    }

    @task *getUnreadCount() {
        const { unreadCount } = yield this.fetch.get('chat-channels/unread-count');
        if (!isNone(unreadCount)) {
            this.unreadCount = unreadCount;
        }
    }

    playSoundForIncomingMessage(chatChannelRecord, data) {
        const sender = this.getSenderFromParticipants(chatChannelRecord);
        const isNotSender = sender ? sender.id !== data.sender_uuid : false;
        if (isNotSender) {
            this.notificationSound.play();
        }
    }

    getSenderFromParticipants(channel) {
        const participants = channel.participants ?? [];
        return participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === this.currentUser.id;
        });
    }

    countUnread(channels) {
        this.unreadCount = channels.reduce((total, channel) => total + channel.unread_count, 0);
    }

    reloadChannels(options = {}) {
        return this.chat.loadChannels.perform({
            withChannels: (channels) => {
                this.channels = channels;
                this.countUnread(channels);
                if (options && options.relisten === true) {
                    this.listenAllChatChannels(channels);
                }
            },
        });
    }

    openNewChannelAsParticipant(data) {
        const normalized = this.store.normalize('chat-channel', data);
        const channel = this.store.push(normalized);
        if (channel && this.getSenderFromParticipants(channel)) {
            this.notificationSound.play();
            this.openChannel(channel);
        }
    }

    closeChannelIfOpen(data) {
        const normalized = this.store.normalize('chat-channel', data);
        const channel = this.store.push(normalized);
        if (channel) {
            this.chat.closeChannel(channel);
        }
    }

    closeChannelIfRemovedFromParticipants(data) {
        const normalized = this.store.normalize('chat-participant', data);
        const removedChatParticipant = this.store.push(normalized);
        if (removedChatParticipant) {
            const channel = this.store.peekRecord('chat-channel', removedChatParticipant.chat_channel_uuid);
            if (channel) {
                this.chat.closeChannel(channel);
            }
        }
    }
}
