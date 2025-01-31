import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { task } from 'ember-concurrency';

export default class ChatWindowComponent extends Component {
    @service chat;
    @service socket;
    @service currentUser;
    @service modalsManager;
    @service fetch;
    @service store;
    @tracked chatWindowElement;
    @tracked channelFeedContainerElement;
    @tracked channel;
    @tracked sender;
    @tracked senderIsCreator;
    @tracked availableUsers = [];
    @tracked pendingMessageContent = '';
    @tracked pendingAttachmentFile;
    @tracked pendingAttachmentFiles = [];
    @tracked isVisible = false;
    acceptedFileTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/pdf',
        'application/x-pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-flv',
        'video/x-ms-wmv',
        'audio/mpeg',
        'video/x-msvideo',
        'application/zip',
        'application/x-tar',
    ];

    constructor(owner, { channel }) {
        super(...arguments);
        this.channel = channel;
        this.sender = this.getSenderFromParticipants(channel);
        // if not participant close window
        if (!this.sender) {
            return later(
                this,
                () => {
                    this.chat.closeChannel(channel);
                },
                300
            );
        }

        this.listenChatChannel(channel);
        this.loadAvailableUsers.perform();
        this.chat.on('chat.closed', this.handleChatClosed.bind(this));
        this.isVisible = true;
    }

    willDestroy() {
        // this.chat.off('chat.closed', this.handleChatClosed.bind(this));
        super.willDestroy(...arguments);
    }

    async listenChatChannel(chatChannelRecord) {
        this.socket.listen(`chat.${chatChannelRecord.public_id}`, (socketEvent) => {
            const { event, data } = socketEvent;
            switch (event) {
                case 'chat.added_participant':
                case 'chat.removed_participant':
                case 'chat_participant.created':
                case 'chat_participant.deleted':
                    this.channel.reloadParticipants();
                    this.loadAvailableUsers.perform();
                    break;
                case 'chat_message.created':
                    this.chat.insertChatMessageFromSocket(this.channel, data);
                    break;
                case 'chat_log.created':
                    this.chat.insertChatLogFromSocket(this.channel, data);
                    break;
                case 'chat_attachment.created':
                    this.chat.insertChatAttachmentFromSocket(this.channel, data);
                    break;
                case 'chat_receipt.created':
                    this.chat.insertChatReceiptFromSocket(this.channel, data);
                    break;
            }
            this.handleChatFeedScroll();
        });
    }

    @task *uploadAttachmentFile(file) {
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        // set file for progress state
        this.pendingAttachmentFile = file;

        // Queue and upload immediatley
        yield this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/chat/${this.channel.id}/attachments`,
                type: 'chat_attachment',
                subject_uuid: this.channel.id,
                subject_type: 'chat_channel',
            },
            (uploadedFile) => {
                this.pendingAttachmentFiles.pushObject(uploadedFile);
                this.pendingAttachmentFile = undefined;
            },
            () => {
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
                this.pendingAttachmentFile = undefined;
            }
        );
    }

    @action removePendingAttachmentFile(pendingFile) {
        this.pendingAttachmentFiles.removeObject(pendingFile);
    }

    @task *sendMessage() {
        const attachments = this.pendingAttachmentFiles.map((file) => file.id);
        yield this.chat.sendMessage(this.channel, this.sender, this.pendingMessageContent, attachments);
        this.pendingMessageContent = '';
        this.pendingAttachmentFiles = [];
        this.handleChatFeedScroll();
    }

    @action handleKeyPress(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault();
            return this.sendMessage.perform();
        }
    }

    @action closeChannel() {
        this.chat.closeChannel(this.channel);
    }

    @action addParticipant(user) {
        this.chat.addParticipant(this.channel, user);
    }

    @action removeParticipant(participant) {
        const isRemovingSelf = participant.id === this.sender.id;
        this.modalsManager.confirm({
            title: isRemovingSelf ? 'Are you sure you would like to leave this chat?' : `Are you sure you wish to remove this participant (${participant.name}) from the chat?`,
            body: isRemovingSelf
                ? 'Once you leave this chat you will not be able to access this chat unless you are added as a participant again'
                : 'Proceeding remove this participant from the chat.',
            confirm: (modal) => {
                modal.startLoading();
                if (isRemovingSelf) {
                    this.closeChannel();
                }

                return this.chat.removeParticipant(this.channel, participant);
            },
        });
    }

    @action editChatName() {
        this.modalsManager.show('modals/edit-chat-name', {
            title: 'Edit chat channel name',
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            channelName: this.channel.name,
            confirm: (modal) => {
                modal.startLoading();
                if (modal.getOption('channelName')) {
                    return this.chat.updateChatChannel(this.channel, { name: modal.getOption('channelName') });
                }

                this.notifications.warning('Name required to save changes.');
            },
        });
    }

    @action positionWindow(chatWindowElement) {
        this.chatWindowElement = chatWindowElement;
        requestAnimationFrame(() => {
            const shiftX = (chatWindowElement.offsetWidth + 20) * this.getChatWindowIndex();
            chatWindowElement.style.transform = `translateX(-${shiftX}px)`;
        });
    }

    @action scrollMessageWindowBottom(channelFeedContainerElement) {
        channelFeedContainerElement.scrollTop = channelFeedContainerElement.scrollHeight;

        // Change scroll behavior to smooth after the initial scroll
        requestAnimationFrame(() => {
            channelFeedContainerElement.style.scrollBehavior = 'smooth';
        });

        // Set the channel feed container element
        this.channelFeedContainerElement = channelFeedContainerElement;
    }

    @task *loadAvailableUsers(params = {}) {
        const users = yield this.store.query('user', params);
        const availableUsers = users.filter((user) => {
            const isNotSender = user.id !== this.sender.user_uuid;
            const isNotParticipant = !this.getParticipantByUserId(user.id);

            return isNotSender && isNotParticipant;
        });

        this.availableUsers = availableUsers;
        return availableUsers;
    }

    handleChatFeedScroll() {
        if (this.channelFeedContainerElement) {
            this.channelFeedContainerElement.scrollTop = this.channelFeedContainerElement.scrollHeight;
            later(
                this,
                () => {
                    this.channelFeedContainerElement.scrollTop = this.channelFeedContainerElement.scrollHeight;
                },
                300
            );
        }
    }

    handleChatClosed() {
        if (this.chatWindowElement) {
            this.positionWindow(this.chatWindowElement);
        }
    }

    getChatWindowIndex() {
        return this.chat.openChannels.indexOf(this.channel);
    }

    getSenderFromParticipants(channel) {
        const participants = channel.participants ?? [];
        const sender = participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === this.currentUser.id;
        });

        this.senderIsCreator = sender ? sender.id === channel.created_by_uuid : false;
        return sender;
    }

    getParticipantByUserId(userId) {
        const participants = this.channel.participants ?? [];
        return participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === userId;
        });
    }
}
