async function handleMusicCommands(
    message,
    command,
    args,
    distube,
    musicModule
) {
    if (command === 'play' || command === 'p') {
        const voiceChannel =
            message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply(
                '❌ Kamu harus berada di voice channel!'
            );
        }

        return musicModule.handlePlayYoutube(
            message,
            args,
            distube
        );
    }

    const queue = distube.getQueue(message);

    if (
        !queue &&
        !['stop', 'dc', 'leave'].includes(command)
    ) {
        return message.reply(
            '❌ Tidak ada musik yang sedang diputar.'
        );
    }

    if (['skip', 's'].includes(command)) {
        return musicModule.handleSkipYoutube(
            message,
            queue
        );
    }

    if (command === 'pause') {
        return musicModule.handlePauseYoutube(
            message,
            queue
        );
    }

    if (command === 'resume') {
        return musicModule.handleResumeYoutube(
            message,
            queue
        );
    }

    if (['stop', 'dc', 'leave'].includes(command)) {
        return musicModule.handleStopYoutube(
            message,
            queue
        );
    }

    if (['queue', 'q'].includes(command)) {
        return musicModule.handleQueueYoutube(
            message,
            queue
        );
    }

    if (['np', 'nowplaying'].includes(command)) {
        return musicModule.handleNowPlaying(
            message,
            queue
        );
    }
}

module.exports = {
    handleMusicCommands
};