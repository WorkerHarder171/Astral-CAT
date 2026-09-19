const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice');

const {
    EmbedBuilder
} = require('discord.js');

async function handleMusicCommands(message, command, args, musicModule) {
    switch (command) {
        case 'play':
        case 'p':
            await musicModule.play(message, args);
            break;

        case 'skip':
        case 's':
            await musicModule.skip(message);
            break;

        case 'pause':
            await musicModule.pause(message);
            break;

        case 'resume':
            await musicModule.resume(message);
            break;

        case 'stop':
        case 'dc':
        case 'leave':
            await musicModule.stop(message);
            break;

        case 'queue':
        case 'q':
            await musicModule.queue(message);
            break;

        case 'np':
        case 'nowplaying':
            await musicModule.nowPlaying(message);
            break;
    }
}

module.exports = {
    handleMusicCommands
};