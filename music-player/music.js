const { spawn } = require('child_process');
const ytdlp = require('yt-dlp-exec');
const {
    joinVoiceChannel,
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    StreamType
} = require('@discordjs/voice');

const players = new Map();
const processes = new Map();

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

function isYoutubeUrl(query) {
    try {
        const url = new URL(query);

        return [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'youtu.be'
        ].includes(url.hostname.toLowerCase());
    } catch {
        return false;
    }
}

async function searchYoutube(query) {
    console.log(`Searching YouTube with yt-dlp: ${query}`);

    const result = await ytdlp(
        `ytsearch1:${query}`,
        {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            flatPlaylist: true,
            noCallHome: true
        }
    );

    if (!result) {
        throw new Error('YouTube search returned no result');
    }

    const video = result.entries?.[0] || result;

    if (!video?.id) {
        throw new Error('YouTube video ID not found');
    }

    const url = `https://www.youtube.com/watch?v=${video.id}`;

    console.log(`YouTube result: ${url}`);

    return {
        id: video.id,
        title: video.title || 'Unknown title',
        url
    };
}

function cleanupProcesses(guildId) {
    const processes = processesMap.get(guildId);

    if (!processes) {
        return;
    }

    const { ytdlpProcess, ffmpeg } = processes;

    try {
        if (ytdlpProcess && !ytdlpProcess.killed) {
            ytdlpProcess.kill();
        }
    } catch (error) {
        console.error('Failed to kill yt-dlp:', error);
    }

    try {
        if (ffmpeg && !ffmpeg.killed) {
            ffmpeg.kill();
        }
    } catch (error) {
        console.error('Failed to kill FFmpeg:', error);
    }

    processesMap.delete(guildId);
}

const processesMap = new Map();

function createFFmpegProcess() {
    const args = [
        '-hide_banner',
        '-loglevel',
        'error',

        '-i',
        'pipe:0',

        '-f',
        's16le',

        '-ar',
        '48000',

        '-ac',
        '2',

        'pipe:1'
    ];

    console.log(`Starting FFmpeg: ${FFMPEG_PATH}`);

    const ffmpeg = spawn(FFMPEG_PATH, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
    });

    return ffmpeg;
}

async function getAudioStream(url, guildId = null) {
    console.log(`Getting audio stream with yt-dlp: ${url}`);

    const ytdlpProcess = ytdlp.exec(
        url,
        {
            format: 'bestaudio/best',
            output: '-',
            quiet: true,
            noWarnings: true,
            noCheckCertificates: true,
            noCallHome: true
        },
        {
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );

    const ffmpeg = createFFmpegProcess();

    if (guildId) {
        processesMap.set(guildId, {
            ytdlpProcess,
            ffmpeg
        });
    }

    ytdlpProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();

        if (message) {
            console.error(`[yt-dlp] ${message}`);
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        const message = data.toString().trim();

        if (message) {
            console.error(`[FFmpeg] ${message}`);
        }
    });

    ytdlpProcess.on('error', (error) => {
        console.error('yt-dlp process error:', error);
    });

    ffmpeg.on('error', (error) => {
        console.error('FFmpeg process error:', error);

        if (error.code === 'ENOENT') {
            console.error(
                `FFmpeg tidak ditemukan: ${FFMPEG_PATH}`
            );
        }
    });

    ytdlpProcess.stdout.on('error', (error) => {
        console.error('yt-dlp stdout error:', error);
    });

    ffmpeg.stdin.on('error', (error) => {
        if (error.code !== 'EPIPE') {
            console.error('FFmpeg stdin error:', error);
        }
    });

    ffmpeg.stdout.on('error', (error) => {
        console.error('FFmpeg stdout error:', error);
    });

    ytdlpProcess.stdout.pipe(ffmpeg.stdin);

    ytdlpProcess.on('close', (code) => {
        console.log(`yt-dlp exited with code ${code}`);

        try {
            if (!ffmpeg.stdin.destroyed) {
                ffmpeg.stdin.end();
            }
        } catch (error) {
            console.error('Failed to close FFmpeg stdin:', error);
        }
    });

    ffmpeg.on('close', (code, signal) => {
        console.log(
            `FFmpeg exited with code ${code}` +
            `${signal ? `, signal ${signal}` : ''}`
        );

        if (guildId) {
            const current = processesMap.get(guildId);

            if (
                current &&
                current.ytdlpProcess === ytdlpProcess &&
                current.ffmpeg === ffmpeg
            ) {
                processesMap.delete(guildId);
            }
        }
    });

    return ffmpeg;
}

async function play(message, args) {
    if (!message.member?.voice?.channel) {
        return message.reply(
            'Kamu harus masuk voice channel terlebih dahulu.'
        );
    }

    if (!args.length) {
        return message.reply(
            'Masukkan judul lagu atau URL YouTube.'
        );
    }

    const voiceChannel = message.member.voice.channel;
    const guildId = message.guild.id;

    let song;

    try {
        const query = args.join(' ').trim();

        if (isYoutubeUrl(query)) {
            song = {
                url: query,
                title: query
            };
        } else {
            song = await searchYoutube(query);
        }

        console.log(`Playing YouTube: ${song.url}`);

        let connection = getVoiceConnection(guildId);

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });
        }

        let player = players.get(guildId);

        if (!player) {
            player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            });

            players.set(guildId, player);

            player.on('error', (error) => {
                console.error(
                    `Audio player error [${guildId}]:`,
                    error
                );

                cleanupProcesses(guildId);
            });
        }

        connection.subscribe(player);

        cleanupProcesses(guildId);

        const ffmpeg = await getAudioStream(
            song.url,
            guildId
        );

        const resource = createAudioResource(
            ffmpeg.stdout,
            {
                inputType: StreamType.Raw,
                inlineVolume: false
            }
        );

        player.play(resource);

        const idleHandler = () => {
            cleanupProcesses(guildId);
            player.removeListener(
                AudioPlayerStatus.Idle,
                idleHandler
            );
        };

        player.once(
            AudioPlayerStatus.Idle,
            idleHandler
        );

        return message.reply(
            `▶️ Memutar **${song.title || song.url}**`
        );
    } catch (error) {
        console.error(
            'YouTube stream error:',
            error
        );

        cleanupProcesses(guildId);

        return message.reply(
            `❌ Gagal memutar lagu.\n\`${error.message}\``
        );
    }
}

async function skip(message) {
    const guildId = message.guild.id;
    const player = players.get(guildId);

    if (!player) {
        return message.reply(
            'Tidak ada lagu yang sedang diputar.'
        );
    }

    cleanupProcesses(guildId);

    player.stop(true);

    return message.reply(
        '⏭️ Lagu dilewati.'
    );
}

async function pause(message) {
    const player = players.get(message.guild.id);

    if (!player) {
        return message.reply(
            'Tidak ada lagu yang sedang diputar.'
        );
    }

    if (player.state.status === AudioPlayerStatus.Paused) {
        return message.reply(
            '⏸️ Musik sudah dijeda.'
        );
    }

    player.pause();

    return message.reply(
        '⏸️ Musik dijeda.'
    );
}

async function resume(message) {
    const player = players.get(message.guild.id);

    if (!player) {
        return message.reply(
            'Tidak ada lagu yang sedang diputar.'
        );
    }

    if (player.state.status !== AudioPlayerStatus.Paused) {
        return message.reply(
            '▶️ Musik tidak sedang dijeda.'
        );
    }

    player.unpause();

    return message.reply(
        '▶️ Musik dilanjutkan.'
    );
}

async function stop(message) {
    const guildId = message.guild.id;
    const player = players.get(guildId);

    cleanupProcesses(guildId);

    if (player) {
        player.stop(true);
        players.delete(guildId);
    }

    const connection = getVoiceConnection(guildId);

    if (connection) {
        connection.destroy();
    }

    return message.reply(
        '⏹️ Musik dihentikan dan bot keluar dari voice channel.'
    );
}

async function queue(message) {
    return message.reply(
        'Queue belum diaktifkan.'
    );
}

async function nowPlaying(message) {
    const player = players.get(message.guild.id);

    if (!player) {
        return message.reply(
            'ℹ️ Tidak ada lagu yang sedang diputar.'
        );
    }

    const status = player.state.status;

    if (status === AudioPlayerStatus.Playing) {
        return message.reply(
            '🎵 Musik sedang diputar.'
        );
    }

    if (status === AudioPlayerStatus.Paused) {
        return message.reply(
            '⏸️ Musik sedang dijeda.'
        );
    }

    return message.reply(
        'ℹ️ Tidak ada lagu yang sedang diputar.'
    );
}

module.exports = {
    play,
    skip,
    pause,
    resume,
    stop,
    queue,
    nowPlaying,
    searchYoutube,
    getAudioStream
};
