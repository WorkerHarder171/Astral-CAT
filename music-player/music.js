const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

const ytdlp = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');

const {
    EmbedBuilder
} = require('discord.js');

const {
    joinVoiceChannel,
    getVoiceConnection,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    StreamType
} = require('@discordjs/voice');

const currentSongs = new Map();
const players = new Map();
const processesMap = new Map();
const queues = new Map();

function formatDuration(seconds) {
    if (!seconds || !Number.isFinite(Number(seconds))) {
        return 'Tidak diketahui';
    }

    seconds = Math.floor(Number(seconds));

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function createMusicEmbed({
    song = null,
    color,
    status = null,
    position = null,
    requester = null,
    error = null,
    title = null
}) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎵 YouTube Music');

    if (song?.title && song?.url) {
        embed.setDescription(
            `[**${song.title}**](${song.url})`
        );
    } else if (title) {
        embed.setDescription(`**${title}**`);
    }

    if (song?.thumbnail) {
        embed.setThumbnail(song.thumbnail);
    }

    if (song?.duration !== undefined) {
        embed.addFields({
            name: '⏱️ Durasi',
            value: formatDuration(song.duration),
            inline: true
        });
    }

    if (position !== null) {
        embed.addFields({
            name: '📊 Posisi Antrean',
            value: `#${position}`,
            inline: true
        });
    }

    if (requester) {
        embed.addFields({
            name: '👤 Diminta oleh',
            value: requester,
            inline: true
        });
    }

    if (status) {
        embed.addFields({
            name: 'Status',
            value: status,
            inline: false
        });
    }

    if (error) {
        embed.addFields({
            name: '❌ Keterangan',
            value: error,
            inline: false
        });
    }

    embed.setFooter({
        text: 'Astral CAT Music Player'
    });

    embed.setTimestamp();

    return embed;
}

function isYoutubeUrl(query) {
    try {
        const url = new URL(query);

        return [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'youtu.be'
        ].includes(
            url.hostname.toLowerCase()
        );
    } catch {
        return false;
    }
}

function createHttpStream(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;

        const request = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        }, response => {
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                response.resume();

                createHttpStream(response.headers.location)
                    .then(resolve)
                    .catch(reject);

                return;
            }

            if (response.statusCode !== 200) {
                response.resume();

                reject(
                    new Error(
                        `HTTP stream failed with status ${response.statusCode}`
                    )
                );

                return;
            }

            resolve(response);
        });

        request.on('error', reject);
    });
}

async function createFFmpegStream(inputStream) {
    if (!ffmpegPath) {
        throw new Error('FFmpeg binary tidak ditemukan.');
    }

    const ffmpeg = spawn(ffmpegPath, [
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
    ], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    inputStream.pipe(ffmpeg.stdin);

    inputStream.on('error', error => {
        ffmpeg.stdin.destroy(error);
    });

    ffmpeg.stdin.on('error', () => {});

    ffmpeg.stderr.on('data', data => {
        const message = data.toString().trim();

        if (message) {
            console.error('[FFmpeg]', message);
        }
    });

    ffmpeg.on('error', error => {
        console.error('[FFmpeg Process Error]', error);
    });

    return ffmpeg;
}

async function searchYoutube(query) {
    console.log(
        `Searching YouTube with yt-dlp: ${query}`
    );

    const result = await ytdlp(
        `ytsearch1:${query}`,
        {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            flatPlaylist: true,
        }
    );

    if (!result) {
        throw new Error(
            'YouTube search returned no result'
        );
    }

    const video =
        result.entries?.[0] ||
        result;

    if (!video?.id) {
        throw new Error(
            'YouTube video ID not found'
        );
    }

    const url =
        `https://www.youtube.com/watch?v=${video.id}`;

    console.log(
        `YouTube result: ${url}`
    );

    return {
        id: video.id,
        title: video.title || 'Unknown title',
        url,
        duration: Number(video.duration) || 0,
        thumbnail:
            video.thumbnail ||
            `https://i.ytimg.com/vi/${video.id}/hq720.jpg`
    };
}

async function getYoutubeInfo(url) {
    console.log(`Getting YouTube information: ${url}`);

    const result = await ytdlp(url, {
        dumpSingleJson: true,
        noWarnings: true,
        skipDownload: true,
    });

    if (!result?.id) {
        throw new Error('YouTube video information not found');
    }

    return {
        id: result.id,
        title: result.title || url,
        url,
        duration: Number(result.duration) || 0,
        thumbnail:
            result.thumbnail ||
            `https://i.ytimg.com/vi/${result.id}/hq720.jpg`,
        formats: result.formats || []
    };
}

function cleanupProcesses(guildId) {
    const processes =
        processesMap.get(guildId);

    if (!processes) {
        return;
    }

    const {
        ffmpeg
    } = processes;

    try {
        if (
            ffmpeg &&
            !ffmpeg.killed
        ) {
            ffmpeg.kill('SIGKILL');
        }
    } catch (error) {
        console.error(
            'Failed to kill FFmpeg:',
            error
        );
    }

    processesMap.delete(guildId);
}

async function getAudioStream(url, guildId = null) {
    console.log(`Getting audio stream with yt-dlp: ${url}`);

    const info = await ytdlp(url, {
        dumpSingleJson: true,
        noWarnings: true,
        skipDownload: true,
        noCallHome: true
    });

    if (!info?.formats?.length) {
        throw new Error('Tidak ditemukan format audio YouTube');
    }

    const audioFormats = info.formats
        .filter(format =>
            format.url &&
            format.vcodec === 'none' &&
            format.acodec &&
            format.acodec !== 'none'
        );

    if (!audioFormats.length) {
        throw new Error('Tidak ditemukan audio stream yang kompatibel');
    }

    const opusFormat = audioFormats
        .filter(format =>
            format.acodec.toLowerCase().includes('opus') &&
            format.ext === 'webm'
        )
        .sort((a, b) =>
            (b.abr || 0) - (a.abr || 0)
        )[0];

    if (opusFormat) {
        console.log('Using direct WebM/Opus stream');

        return {
            type: 'opus',
            url: opusFormat.url,
            format: opusFormat
        };
    }

    const fallbackFormat = audioFormats
        .sort((a, b) =>
            (b.abr || 0) - (a.abr || 0)
        )[0];

    console.log(
        `Using FFmpeg fallback: ${fallbackFormat.ext}/${fallbackFormat.acodec}`
    );

    return {
        type: 'ffmpeg',
        url: fallbackFormat.url,
        format: fallbackFormat
    };
}

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(
            guildId,
            []
        );
    }

    return queues.get(guildId);
}

function getPlayer(guildId) {
    return players.get(guildId);
}

function getCurrentSong(guildId) {
    return currentSongs.get(guildId);
}

function isPlayerActive(guildId) {
    const player =
        players.get(guildId);

    if (!player) {
        return false;
    }

    return (
        player.state.status ===
            AudioPlayerStatus.Playing ||
        player.state.status ===
            AudioPlayerStatus.Paused ||
        processesMap.has(guildId)
    );
}


async function playSong(guildId, song, message) {
    const player = getPlayer(guildId);

    if (!player) {
        throw new Error('Audio player tidak ditemukan');
    }

    const connection = getVoiceConnection(guildId);

    if (!connection) {
        throw new Error(
            'Bot tidak terhubung ke voice channel'
        );
    }

    cleanupProcesses(guildId);

    console.log(`Playing YouTube: ${song.url}`);

    const audio = await getAudioStream(song.url);

    let resource;

    if (audio.type === 'opus') {
        const stream = await createHttpStream(audio.url);

        resource = createAudioResource(stream, {
            inputType: StreamType.WebmOpus
        });
    } else {
        const stream = await createHttpStream(audio.url);
        const ffmpeg = await createFFmpegStream(stream);

        resource = createAudioResource(ffmpeg.stdout, {
            inputType: StreamType.Raw
        });
    }

    player.play(resource);

    return song;
}

async function playNext(
    guildId,
    message
) {
    const queue =
        getQueue(guildId);

    if (!queue.length) {
        currentSongs.delete(
            guildId
        );

        return null;
    }

    const nextSong =
        queue.shift();

    try {
        await playSong(
            guildId,
            nextSong,
            message
        );

        console.log(
            `Playing next queued song: ${nextSong.title}`
        );

        return nextSong;
    } catch (error) {
        console.error(
            'Failed to play queued song:',
            error
        );

        if (queue.length) {
            return playNext(
                guildId,
                message
            );
        }

        currentSongs.delete(
            guildId
        );

        return null;
    }
}

function setupPlayer(
    guildId,
    player
) {
    player.on(
        'error',
        async (error) => {
            console.error(
                `Audio player error [${guildId}]:`,
                error
            );

            cleanupProcesses(
                guildId
            );
        }
    );

    player.on(
        'stateChange',
        async (
            oldState,
            newState
        ) => {
            if (
                oldState.status !==
                    AudioPlayerStatus.Playing &&
                newState.status !==
                    AudioPlayerStatus.Idle
            ) {
                return;
            }

            if (
                newState.status !==
                AudioPlayerStatus.Idle
            ) {
                return;
            }

            const processes =
                processesMap.has(
                    guildId
                );

            if (processes) {
                cleanupProcesses(
                    guildId
                );
            }

            const queue =
                getQueue(guildId);

            if (!queue.length) {
                currentSongs.delete(
                    guildId
                );

                return;
            }

            const connection =
                getVoiceConnection(
                    guildId
                );

            if (!connection) {
                return;
            }

            const nextSong =
                queue.shift();

            try {
                await playSong(
                    guildId,
                    nextSong,
                    null
                );

                console.log(
                    `Auto-playing: ${nextSong.title}`
                );
            } catch (error) {
                console.error(
                    'Failed to auto-play next song:',
                    error
                );

                if (queue.length) {
                    try {
                        await playNext(
                            guildId,
                            null
                        );
                    } catch (
                        nextError
                    ) {
                        console.error(
                            'Failed to recover queue:',
                            nextError
                        );
                    }
                }
            }
        }
    );
}

async function play(
    message,
    args
) {
    if (
        !message.member?.voice?.channel
    ) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '❌ Tidak dapat memutar musik',
                    error:
                        'Kamu harus masuk voice channel terlebih dahulu.'
                })
            ]
        });
    }

    if (!args.length) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '❌ Query kosong',
                    error:
                        'Masukkan judul lagu atau URL YouTube.'
                })
            ]
        });
    }

    const voiceChannel =
        message.member.voice.channel;

    const guildId =
        message.guild.id;

    try {
        const query =
            args.join(' ').trim();

        let song;

        if (isYoutubeUrl(query)) {
            song =
                await getYoutubeInfo(
                    query
                );
        } else {
            song =
                await searchYoutube(
                    query
                );
        }

        song.requester =
            message.author.username;

        let connection =
            getVoiceConnection(
                guildId
            );

        if (!connection) {
            connection =
                joinVoiceChannel({
                    channelId:
                        voiceChannel.id,
                    guildId,
                    adapterCreator:
                        message.guild
                            .voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false
                });
        }

        let player =
            players.get(
                guildId
            );

        if (!player) {
            player =
                createAudioPlayer({
                    behaviors: {
                        noSubscriber:
                            NoSubscriberBehavior.Play
                    }
                });

            players.set(
                guildId,
                player
            );

            setupPlayer(
                guildId,
                player
            );
        }

        connection.subscribe(
            player
        );

        const queue =
            getQueue(guildId);

        const isActive =
            isPlayerActive(
                guildId
            );

        if (isActive) {
            queue.push(
                song
            );

            const position =
                queue.length + 1;

            const embed =
                createMusicEmbed({
                    song,
                    color: 0x5865F2,
                    status:
                        '📋 Ditambahkan ke antrean',
                    position,
                    requester:
                        message.author
                            .username
                });

            embed.addFields({
                name:
                    '📊 Total Antrean',
                value:
                    `${queue.length + 1}`,
                inline: true
            });

            return message.reply({
                embeds: [
                    embed
                ]
            });
        }

        await playSong(
            guildId,
            song,
            message
        );

        const embed =
            createMusicEmbed({
                song,
                color: 0x57F287,
                status:
                    '▶️ Sedang diputar',
                position: 1,
                requester:
                    message.author
                        .username
            });

        return message.reply({
            embeds: [
                embed
            ]
        });
    } catch (error) {
        console.error(
            'YouTube stream error:',
            error
        );

        cleanupProcesses(
            guildId
        );

        const embed =
            createMusicEmbed({
                color: 0xED4245,
                status:
                    '❌ Gagal memutar lagu',
                requester:
                    message.author
                        .username,
                error:
                    `\`${error.message}\``
            });

        return message.reply({
            embeds: [
                embed
            ]
        });
    }
}

async function skip(
    message
) {
    const guildId =
        message.guild.id;

    const player =
        players.get(
            guildId
        );

    const queue =
        getQueue(guildId);

    if (!player) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '❌ Tidak ada musik',
                    error:
                        'Tidak ada lagu yang sedang diputar.'
                })
            ]
        });
    }

    cleanupProcesses(
        guildId
    );

    if (!queue.length) {
        currentSongs.delete(
            guildId
        );

        player.stop(
            true
        );

        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0x57F287,
                    status:
                        '⏭️ Lagu dilewati',
                    error:
                        'Tidak ada lagu berikutnya di antrean.'
                })
            ]
        });
    }

    const nextSong =
        queue.shift();

    player.stop(
        true
    );

    try {
        await playSong(
            guildId,
            nextSong,
            message
        );

        const embed =
            createMusicEmbed({
                song: nextSong,
                color: 0x57F287,
                status:
                    '⏭️ Lagu dilewati',
                position: 1,
                requester:
                    nextSong.requester ||
                    message.author
                        .username
            });

        return message.reply({
            embeds: [
                embed
            ]
        });
    } catch (error) {
        console.error(
            'Failed to play next queued song:',
            error
        );

        const embed =
            createMusicEmbed({
                color: 0xED4245,
                status:
                    '❌ Gagal memutar lagu berikutnya',
                error:
                    error.message
            });

        return message.reply({
            embeds: [
                embed
            ]
        });
    }
}

async function pause(
    message
) {
    const guildId =
        message.guild.id;

    const player =
        players.get(
            guildId
        );

    const song =
        getCurrentSong(
            guildId
        );

    if (!player) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '❌ Tidak ada musik',
                    error:
                        'Tidak ada lagu yang sedang diputar.'
                })
            ]
        });
    }

    if (
        player.state.status ===
        AudioPlayerStatus.Paused
    ) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    song,
                    color: 0xFEE75C,
                    status:
                        '⏸️ Musik sudah dijeda',
                    position: 1,
                    requester:
                        song?.requester ||
                        message.author
                            .username
                })
            ]
        });
    }

    if (
        player.state.status !==
        AudioPlayerStatus.Playing
    ) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '❌ Tidak ada musik',
                    error:
                        'Tidak ada musik yang sedang diputar.'
                })
            ]
        });
    }

    player.pause();

    return message.reply({
        embeds: [
            createMusicEmbed({
                song,
                color: 0xFEE75C,
                status:
                    '⏸️ Musik dijeda',
                position: 1,
                requester:
                    song?.requester ||
                    message.author
                        .username
            })
        ]
    });
}

async function resume(
    message
) {
    const guildId =
        message.guild.id;

    const player =
        players.get(
            guildId
        );

    const song =
        getCurrentSong(
            guildId
        );

    if (!player) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '❌ Tidak ada musik',
                    error:
                        'Tidak ada lagu yang sedang diputar.'
                })
            ]
        });
    }

    if (
        player.state.status !==
        AudioPlayerStatus.Paused
    ) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '❌ Tidak sedang dijeda',
                    error:
                        'Musik tidak sedang dalam kondisi pause.'
                })
            ]
        });
    }

    player.unpause();

    return message.reply({
        embeds: [
            createMusicEmbed({
                song,
                color: 0x57F287,
                status:
                    '▶️ Musik dilanjutkan',
                position: 1,
                requester:
                    song?.requester ||
                    message.author
                        .username
            })
        ]
    });
}

async function stop(
    message
) {
    const guildId =
        message.guild.id;

    const player =
        players.get(
            guildId
        );

    cleanupProcesses(
        guildId
    );

    const queue =
        getQueue(guildId);

    const queueCount =
        queue.length;

    queue.length = 0;

    currentSongs.delete(
        guildId
    );

    if (player) {
        player.stop(
            true
        );

        players.delete(
            guildId
        );
    }

    queues.delete(
        guildId
    );

    const connection =
        getVoiceConnection(
            guildId
        );

    if (connection) {
        connection.destroy();
    }

    const embed =
        createMusicEmbed({
            color: 0xED4245,
            status:
                '⏹️ Musik dihentikan',
            error:
                queueCount > 0
                    ? `Musik dihentikan dan **${queueCount} lagu** di antrean telah dihapus.`
                    : 'Musik dihentikan dan bot keluar dari voice channel.'
        });

    return message.reply({
        embeds: [
            embed
        ]
    });
}

async function queue(
    message
) {
    const guildId =
        message.guild.id;

    const player =
        players.get(
            guildId
        );

    const currentSong =
        getCurrentSong(
            guildId
        );

    const songQueue =
        getQueue(guildId);

    if (
        !currentSong &&
        !songQueue.length
    ) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        '📋 Queue kosong',
                    error:
                        'Tidak ada lagu yang sedang diputar maupun menunggu di antrean.'
                })
            ]
        });
    }

    const embed =
        new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(
                '🎵 YouTube Music'
            )
            .setFooter({
                text:
                    'Astral CAT Music Player'
            })
            .setTimestamp();

    if (currentSong) {
        embed.addFields({
            name:
                '▶️ Sedang Diputar',
            value:
                `[**${currentSong.title}**](${currentSong.url})\n` +
                `⏱️ ${formatDuration(currentSong.duration)}\n` +
                `👤 ${currentSong.requester || 'Unknown'}`,
            inline: false
        });

        if (currentSong.thumbnail) {
            embed.setThumbnail(
                currentSong.thumbnail
            );
        }
    }

    if (songQueue.length) {
        const queueText =
            songQueue
                .map(
                    (song, index) =>
                        `**${index + 2}.** [${song.title}](${song.url})\n` +
                        `⏱️ ${formatDuration(song.duration)} • 👤 ${song.requester || 'Unknown'}`
                )
                .join('\n\n');

        embed.addFields({
            name:
                '📋 Queue Berikutnya',
            value:
                queueText,
            inline: false
        });
    } else {
        embed.addFields({
            name:
                '📋 Queue Berikutnya',
            value:
                'Tidak ada lagu berikutnya.',
            inline: false
        });
    }

    embed.addFields({
        name:
            '📊 Total Antrean',
        value:
            `**${currentSong ? songQueue.length + 1 : songQueue.length}**`,
        inline: true
    });

    return message.reply({
        embeds: [
            embed
        ]
    });
}

async function nowPlaying(
    message
) {
    const guildId =
        message.guild.id;

    const player =
        players.get(
            guildId
        );

    const song =
        getCurrentSong(
            guildId
        );

    if (!player || !song) {
        return message.reply({
            embeds: [
                createMusicEmbed({
                    color: 0xED4245,
                    status:
                        'ℹ️ Tidak ada musik',
                    error:
                        'Tidak ada lagu yang sedang diputar.'
                })
            ]
        });
    }

    const status =
        player.state.status;

    let color;
    let statusText;

    if (
        status ===
        AudioPlayerStatus.Playing
    ) {
        color = 0x57F287;
        statusText =
            '▶️ Sedang diputar';
    } else if (
        status ===
        AudioPlayerStatus.Paused
    ) {
        color = 0xFEE75C;
        statusText =
            '⏸️ Musik dijeda';
    } else {
        color = 0xED4245;
        statusText =
            'ℹ️ Tidak aktif';
    }

    const songQueue =
        getQueue(guildId);

    const embed =
        createMusicEmbed({
            song,
            color,
            status: statusText,
            position: 1,
            requester:
                song.requester
        });

    embed.addFields({
        name:
            '📋 Queue',
        value:
            `${songQueue.length} lagu menunggu`,
        inline: true
    });

    return message.reply({
        embeds: [
            embed
        ]
    });
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
