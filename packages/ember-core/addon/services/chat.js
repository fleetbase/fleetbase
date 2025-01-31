import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency';
import { all } from 'rsvp';

export default class ChatService extends Service.extend(Evented) {
    @service store;
    @service currentUser;
    @service appCache;
    @tracked channels = [];
    @tracked openChannels = [];

    openChannel(chatChannelRecord) {
        if (this.openChannels.includes(chatChannelRecord)) {
            return;
        }
        this.openChannels.pushObject(chatChannelRecord);
        this.rememberOpenedChannel(chatChannelRecord);
        this.trigger('chat.opened', chatChannelRecord);
    }

    closeChannel(chatChannelRecord) {
        const index = this.openChannels.findIndex((_) => _.id === chatChannelRecord.id);
        if (index >= 0) {
            this.openChannels.removeAt(index);
            this.trigger('chat.closed', chatChannelRecord);
        }
        this.forgetOpenedChannel(chatChannelRecord);
    }

    rememberOpenedChannel(chatChannelRecord) {
        let openedChats = this.appCache.get('open-chats', []);
        if (isArray(openedChats) && !openedChats.includes(chatChannelRecord.id)) {
            openedChats.pushObject(chatChannelRecord.id);
        } else {
            openedChats = [chatChannelRecord.id];
        }
        this.appCache.set('open-chats', openedChats);
    }

    forgetOpenedChannel(chatChannelRecord) {
        let openedChats = this.appCache.get('open-chats', []);
        if (isArray(openedChats)) {
            openedChats.removeObject(chatChannelRecord.id);
        } else {
            openedChats = [];
        }
        this.appCache.set('open-chats', openedChats);
    }

    restoreOpenedChats() {
        const openedChats = this.appCache.get('open-chats', []);
        if (isArray(openedChats)) {
            const findAll = openedChats.map((id) => this.store.findRecord('chat-channel', id));
            return all(findAll).then((openedChatRecords) => {
                if (isArray(openedChatRecords)) {
                    for (let i = 0; i < openedChatRecords.length; i++) {
                        const chatChannelRecord = openedChatRecords[i];
                        this.openChannel(chatChannelRecord);
                    }
                }
                return openedChatRecords;
            });
        }

        return [];
    }

    getOpenChannels() {
        return this.openChannels;
    }

    createChatChannel(name) {
        const chatChannelRecord = this.store.createRecord('chat-channel', { name });
        return chatChannelRecord.save().finally(() => {
            this.trigger('chat.created', chatChannelRecord);
        });
    }

    deleteChatChannel(chatChannelRecord) {
        return chatChannelRecord.destroyRecord().finally(() => {
            this.trigger('chat.deleted', chatChannelRecord);
        });
    }

    updateChatChannel(chatChannelRecord, props = {}) {
        chatChannelRecord.setProperties(props);
        return chatChannelRecord.save().finally(() => {
            this.trigger('chat.updated', chatChannelRecord);
        });
    }

    addParticipant(chatChannelRecord, userRecord) {
        const chatParticipant = this.store.createRecord('chat-participant', {
            chat_channel_uuid: chatChannelRecord.id,
            user_uuid: userRecord.id,
        });
        return chatParticipant.save().finally(() => {
            this.trigger('chat.added_participant', chatParticipant, chatChannelRecord);
        });
    }

    removeParticipant(chatChannelRecord, chatParticipant) {
        return chatParticipant.destroyRecord().finally(() => {
            this.trigger('chat.removed_participant', chatParticipant, chatChannelRecord);
        });
    }

    async sendMessage(chatChannelRecord, senderRecord, messageContent = '', attachments = []) {
        const chatMessage = this.store.createRecord('chat-message', {
            chat_channel_uuid: chatChannelRecord.id,
            sender_uuid: senderRecord.id,
            content: messageContent,
            attachment_files: attachments,
        });

        return chatMessage
            .save()
            .then((chatMessageRecord) => {
                if (chatChannelRecord.doesntExistsInFeed('message', chatMessageRecord)) {
                    chatChannelRecord.feed.pushObject({
                        type: 'message',
                        created_at: chatMessageRecord.created_at,
                        data: chatMessageRecord.serialize(),
                        record: chatMessageRecord,
                    });
                }
                return chatMessageRecord;
            })
            .finally(() => {
                this.trigger('chat.feed_updated', chatMessage, chatChannelRecord);
                this.trigger('chat.message_created', chatMessage, chatChannelRecord);
            });
    }

    deleteMessage(chatMessageRecord) {
        return chatMessageRecord.destroyRecord().finally(() => {
            this.trigger('chat.feed_updated', chatMessageRecord);
            this.trigger('chat.message_deleted', chatMessageRecord);
        });
    }

    insertChatMessageFromSocket(chatChannelRecord, data) {
        // normalize and create record
        const normalized = this.store.normalize('chat-message', data);
        const record = this.store.push(normalized);

        // make sure it doesn't exist in feed already
        if (chatChannelRecord.existsInFeed('message', record)) {
            return;
        }

        // create feed item
        const item = {
            type: 'message',
            created_at: record.created_at,
            data,
            record,
        };

        // add item to feed
        chatChannelRecord.feed.pushObject(item);

        // trigger event
        this.trigger('chat.feed_updated', record, chatChannelRecord);
        this.trigger('chat.message_created', record, chatChannelRecord);
    }

    insertChatLogFromSocket(chatChannelRecord, data) {
        // normalize and create record
        const normalized = this.store.normalize('chat-log', data);
        const record = this.store.push(normalized);

        // make sure it doesn't exist in feed already
        if (chatChannelRecord.existsInFeed('log', record)) {
            return;
        }

        // create feed item
        const item = {
            type: 'log',
            created_at: record.created_at,
            data,
            record,
        };

        // add item to feed
        chatChannelRecord.feed.pushObject(item);

        // trigger event
        this.trigger('chat.feed_updated', record, chatChannelRecord);
        this.trigger('chat.log_created', record, chatChannelRecord);
    }

    insertChatAttachmentFromSocket(chatChannelRecord, data) {
        // normalize and create record
        const normalized = this.store.normalize('chat-attachment', data);
        const record = this.store.push(normalized);

        // Find the chat message the record belongs to in the feed
        const chatMessage = chatChannelRecord.feed.find((item) => {
            return item.type === 'message' && item.record.id === record.chat_message_uuid;
        });

        // If we have the chat message then we can insert it to attachments
        // This should work because chat message will always be created before the chat attachment
        if (chatMessage) {
            // Make sure the attachment isn't already attached to the message
            const isNotAttached = chatMessage.record.attachments.find((attachment) => attachment.id === record.id) === undefined;
            if (isNotAttached) {
                chatMessage.record.attachments.pushObject(record);
                // trigger event
                this.trigger('chat.feed_updated', record, chatChannelRecord);
                this.trigger('chat.attachment_created', record, chatChannelRecord);
            }
        }
    }

    insertChatReceiptFromSocket(chatChannelRecord, data) {
        // normalize and create record
        const normalized = this.store.normalize('chat-receipt', data);
        const record = this.store.push(normalized);

        // Find the chat message the record belongs to in the feed
        const chatMessage = chatChannelRecord.feed.find((item) => {
            return item.type === 'message' && item.record.id === record.chat_message_uuid;
        });

        // If we have the chat message then we can insert it to receipts
        // This should work because chat message will always be created before the chat receipt
        if (chatMessage) {
            // Make sure the receipt isn't already attached to the message
            const isNotAttached = chatMessage.record.receipts.find((receipt) => receipt.id === record.id) === undefined;
            if (isNotAttached) {
                chatMessage.record.receipts.pushObject(record);
                // trigger event
                this.trigger('chat.receipt_created', record, chatChannelRecord);
            }
        }
    }

    @task *loadMessages(chatChannelRecord) {
        const messages = yield this.store.query('chat-message', { chat_channel_uuid: chatChannelRecord.id });
        chatChannelRecord.set('messages', messages);
        return messages;
    }

    @task *loadChannels(options = {}) {
        const params = options.params || {};
        const channels = yield this.store.query('chat-channel', params);
        if (isArray(channels)) {
            this.channels = channels;
        }

        if (typeof options.withChannels === 'function') {
            options.withChannels(channels);
        }

        return channels;
    }
}
