import { helper } from '@ember/component/helper';

export default helper(function canRemoveChatParticipant([channel, currentParticipant, focusedParticipant]) {
    // Cannot remove the creator of the channel
    if (channel.created_by_uuid === focusedParticipant.user_uuid) {
        return false;
    }

    const isChannelCreator = currentParticipant && channel.created_by_uuid === currentParticipant.user_uuid;
    const isFocusingSelf = currentParticipant && currentParticipant.id === focusedParticipant.id;
    if (isChannelCreator || isFocusingSelf) {
        return true;
    }

    return false;
});
