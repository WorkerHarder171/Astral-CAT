const musicPlayer = require('../music-player');

async function handleMusicCommands(
    message,
    command,
    args
) {
    switch (command) {
        case 'play':
        case 'p':
            await musicPlayer.play(
                message,
                args
            );
            break;

        case 'skip':
        case 's':
            await musicPlayer.skip(
                message
            );
            break;

        case 'pause':
            await musicPlayer.pause(
                message
            );
            break;

        case 'resume':
            await musicPlayer.resume(
                message
            );
            break;

        case 'stop':
        case 'dc':
        case 'leave':
            await musicPlayer.stop(
                message
            );
            break;

        case 'queue':
        case 'q':
            await musicPlayer.queue(
                message
            );
            break;

        case 'np':
        case 'nowplaying':
            await musicPlayer.nowPlaying(
                message
            );
            break;
    }
}

module.exports = {
    handleMusicCommands
};