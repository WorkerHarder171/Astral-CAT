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

const yt = require('./youtube');
const spotify = require('./spotify');

const currentSongs = new Map();
const players = new Map();
const processesMap = new Map();
const queues = new Map();
const advancing = new Set();

function formatDuration(seconds) {
    const total = Math.max(
        0,
        Number(seconds || 0)
    );

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(
        (total % 3600) / 60
    );
    const secs = Math.floor(total % 60);

    if (hours > 0) {
        return [
            hours,
            String(minutes).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].join(':');
    }

    return [
        minutes,
        String(secs).padStart(2, '0')
    ].join(':');
}

function parsePlaySource(args) {
    if (!args.length) {
        return {
            source: 'auto',
            query: ''
        };
    }

    const first = args[0].toLowerCase();

    if (
        first === 'yt' ||
        first === 'youtube'
    ) {
        return {
            source: 'youtube',
            query: args
                .slice(1)
                .join(' ')
                .trim()
        };
    }

    if (
        first === 'spotify' ||
        first === 'sp'
    ) {
        return {
            source: 'spotify',
            query: args
                .slice(1)
                .join(' ')
                .trim()
        };
    }

    return {
        source: 'auto',
        query: args
            .join(' ')
            .trim()
    };
}

function createMusicEmbed(
    song,
    {
        title = '🎵 Now Playing',
        status = null,
        queuePosition = null,
        error = null
    } = {}
) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(
            song.url
                ? `[${song.title}](${song.url})`
                : song.title
        );

    if (song.thumbnail) {
        embed.setThumbnail(song.thumbnail);
    }

    embed.addFields({
        name: '⏱️ Duration',
        value: formatDuration(song.duration),
        inline: true
    });

    embed.addFields({
        name: '🎧 Source',
        value:
            song.source === 'spotify'
                ? 'Spotify'
                : 'YouTube',
        inline: true
    });

    if (song.playbackSource) {
        embed.addFields({
            name: '▶️ Playback',
            value:
                song.playbackSource === 'youtube'
                    ? 'YouTube'
                    : song.playbackSource,
            inline: true
        });
    }

    if (song.artist) {
        embed.addFields({
            name: '🎤 Artist',
            value: song.artist,
            inline: true
        });
    }

    if (song.album) {
        embed.addFields({
            name: '💿 Album',
            value: song.album,
            inline: true
        });
    }

    if (song.requester) {
        embed.addFields({
            name: '👤 Requester',
            value: song.requester,
            inline: true
        });
    }

    if (queuePosition !== null) {
        embed.addFields({
            name: '📌 Queue Position',
            value: String(queuePosition),
            inline: true
        });
    }

    if (status) {
        embed.addFields({
            name: '📡 Status',
            value: status,
            inline: true
        });
    }

    if (song.spotifyUrl) {
        embed.addFields({
            name: '🟢 Spotify',
            value: `[Open Spotify](${song.spotifyUrl})`,
            inline: true
        });
    }

    if (song.youtubeUrl) {
        embed.addFields({
            name: '🔴 YouTube',
            value: `[Open YouTube](${song.youtubeUrl})`,
            inline: true
        });
    }

    if (error) {
        embed.addFields({
            name: '❌ Error',
            value: String(error).slice(0, 1000),
            inline: false
        });
    }

    return embed;
}

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, []);
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
    const player = players.get(guildId);

    if (!player) {
        return false;
    }

    return (
        player.state.status ===
            AudioPlayerStatus.Playing ||
        player.state.status ===
            AudioPlayerStatus.Paused ||
        currentSongs.has(guildId)
    );
}

function cleanupProcesses(guildId) {
    const target = processesMap.get(guildId);

    if (!target) {
        return;
    }

    try {
        if (typeof target.cleanup === 'function') {
            target.cleanup();
        } else if (Array.isArray(target)) {
            for (const proc of target) {
                if (proc && !proc.killed) {
                    try {
                        proc.kill();
                    } catch {}
                }
            }
        } else if (target && typeof target.kill === 'function') {
            if (!target.killed) {
                try {
                    target.kill();
                } catch {}
            }
        }
    } catch {}

    processesMap.delete(guildId);
}

async function resolveYoutubeSong(query) {
    const song = yt.isYoutubeUrl(query)
        ? await yt.getYoutubeInfo(query)
        : await yt.searchYoutube(query);

    return {
        ...song,
        source: 'youtube',
        playbackSource: 'youtube',
        playbackUrl: song.url,
        youtubeUrl: song.url
    };
}

async function resolveSpotifySong(query) {
    const spotifySong =
        await spotify.resolveSpotify(query);

    const youtubeSong =
        await yt.searchYoutube(
            `${spotifySong.searchQuery} audio`
        );

    return {
        ...spotifySong,

        source: 'spotify',

        playbackSource: 'youtube',

        playbackUrl: youtubeSong.url,

        youtubeUrl: youtubeSong.url,

        spotifyUrl: spotifySong.url,

        duration:
            spotifySong.duration ||
            youtubeSong.duration,

        thumbnail:
            spotifySong.thumbnail ||
            youtubeSong.thumbnail
    };
}

async function resolveSong(
    query,
    source = 'auto'
) {
    if (source === 'spotify') {
        return resolveSpotifySong(query);
    }

    if (source === 'youtube') {
        return resolveYoutubeSong(query);
    }

    if (
        spotify.isSpotifyUrl(query) ||
        spotify.isSpotifyUri(query)
    ) {
        return resolveSpotifySong(query);
    }

    return resolveYoutubeSong(query);
}

async function playSong(
    guildId,
    song
) {
    const player = players.get(guildId);

    if (!player) {
        throw new Error(
            'Audio player belum tersedia.'
        );
    }

    cleanupProcesses(guildId);

    const playbackUrl =
        song.playbackUrl ||
        song.youtubeUrl ||
        song.url;

    if (!playbackUrl) {
        throw new Error(
            'URL playback tidak tersedia.'
        );
    }

    const audio = yt.createAudioStream(playbackUrl);

    processesMap.set(
        guildId,
        audio
    );

    const resource = createAudioResource(
        audio.stream,
        {
            inputType:
                StreamType.Raw
        }
    );

    currentSongs.set(
        guildId,
        song
    );

    player.play(resource);
}

async function playNext(guildId) {
    const queue = getQueue(guildId);

    if (!queue.length) {
        currentSongs.delete(guildId);
        cleanupProcesses(guildId);
        return;
    }

    const nextSong = queue.shift();

    try {
        await playSong(
            guildId,
            nextSong
        );
    } catch (error) {
        console.error(
            '[Music] Failed to play next:',
            error
        );

        currentSongs.delete(guildId);
        cleanupProcesses(guildId);

        if (queue.length) {
            await playNext(guildId);
        }
    }
}

function setupPlayer(
    guildId,
    player
) {
    player.on(
        'stateChange',
        async (_, newState) => {
            if (
                newState.status !==
                AudioPlayerStatus.Idle
            ) {
                return;
            }

            cleanupProcesses(guildId);

            if (advancing.has(guildId)) {
                return;
            }

            const queue =
                queues.get(guildId);

            if (!queue?.length) {
                currentSongs.delete(guildId);
                return;
            }

            advancing.add(guildId);

            try {
                await playNext(guildId);
            } catch (error) {
                console.error(
                    '[Music] Auto next error:',
                    error
                );
            } finally {
                advancing.delete(guildId);
            }
        }
    );

    player.on(
        'error',
        error => {
            console.error(
                '[Music] Player error:',
                error
            );

            cleanupProcesses(guildId);
        }
    );
}

async function play(
    message,
    args
) {
    const voiceChannel =
        message.member?.voice?.channel;

    if (!voiceChannel) {
        await message.reply(
            '❌ Kamu harus masuk voice channel terlebih dahulu.'
        );
        return;
    }

    const {
        source,
        query
    } = parsePlaySource(args);

    if (!query) {
        await message.reply(
            [
                '❌ Masukkan judul atau URL.',
                '',
                '`!play sesi potret`',
                '`!play yt sesi potret`',
                '`!play spotify sesi potret`'
            ].join('\n')
        );
        return;
    }

    const existingConnection =
        getVoiceConnection(
            message.guild.id
        );

    if (
        existingConnection &&
        existingConnection.joinConfig
            .channelId !== voiceChannel.id
    ) {
        await message.reply(
            '❌ Bot sedang berada di voice channel lain.'
        );
        return;
    }

    let song;

    try {
        song = await resolveSong(
            query,
            source
        );
    } catch (error) {
        console.error(
            '[Music] Resolve error:',
            error
        );

        await message.reply(
            `❌ Gagal mencari lagu: ${error.message}`
        );
        return;
    }

    song.requester =
        message.author.toString();

    const connection =
        existingConnection ||
        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator:
                message.guild.voiceAdapterCreator,
            selfDeaf: true
        });

    let player =
        players.get(
            message.guild.id
        );

    if (!player) {
        player =
            createAudioPlayer({
                behaviors: {
                    noSubscriber:
                        NoSubscriberBehavior.Pause
                }
            });

        players.set(
            message.guild.id,
            player
        );

        setupPlayer(
            message.guild.id,
            player
        );
    }

    connection.subscribe(player);

    const guildId =
        message.guild.id;

    if (isPlayerActive(guildId)) {
        const queue =
            getQueue(guildId);

        queue.push(song);

        await message.reply({
            embeds: [
                createMusicEmbed(
                    song,
                    {
                        title: '📥 Ditambahkan ke Queue',
                        queuePosition:
                            queue.length
                    }
                )
            ]
        });

        return;
    }

    try {
        await playSong(
            guildId,
            song
        );

        await message.reply({
            embeds: [
                createMusicEmbed(
                    song,
                    {
                        title: '▶️ Now Playing',
                        status: 'Playing'
                    }
                )
            ]
        });
    } catch (error) {
        console.error(
            '[Music] Play error:',
            error
        );

        currentSongs.delete(guildId);
        cleanupProcesses(guildId);

        await message.reply({
            embeds: [
                createMusicEmbed(
                    song,
                    {
                        title: '❌ Gagal Memutar Lagu',
                        error: error.message
                    }
                )
            ]
        });
    }
}

async function skip(message) {
    const guildId =
        message.guild.id;

    const player =
        players.get(guildId);

    const current =
        currentSongs.get(guildId);

    if (!player || !current) {
        await message.reply(
            '❌ Tidak ada lagu yang sedang diputar.'
        );
        return;
    }

    const queue =
        getQueue(guildId);

    const nextSong =
        queue[0] || null;

    cleanupProcesses(guildId);

    player.stop(true);

    if (nextSong) {
        await message.reply(
            `⏭️ Lagu dilewati. Berikutnya: **${nextSong.title}**`
        );
    } else {
        await message.reply(
            '⏭️ Lagu dilewati. Queue kosong.'
        );
    }
}

async function pause(message) {
    const guildId =
        message.guild.id;

    const player =
        players.get(guildId);

    if (
        !player ||
        player.state.status !==
            AudioPlayerStatus.Playing
    ) {
        await message.reply(
            '❌ Tidak ada lagu yang sedang diputar.'
        );
        return;
    }

    player.pause();

    await message.reply(
        '⏸️ Musik dijeda.'
    );
}

async function resume(message) {
    const guildId =
        message.guild.id;

    const player =
        players.get(guildId);

    if (
        !player ||
        player.state.status !==
            AudioPlayerStatus.Paused
    ) {
        await message.reply(
            '❌ Musik tidak sedang dijeda.'
        );
        return;
    }

    player.unpause();

    await message.reply(
        '▶️ Musik dilanjutkan.'
    );
}

async function stop(message) {
    const guildId =
        message.guild.id;

    const player =
        players.get(guildId);

    const connection =
        getVoiceConnection(guildId);

    if (!player && !connection) {
        await message.reply(
            '❌ Bot tidak sedang berada di voice channel.'
        );
        return;
    }

    const queue =
        queues.get(guildId);

    const queueCount =
        queue?.length || 0;

    cleanupProcesses(guildId);

    if (queue) {
        queue.length = 0;
    }

    currentSongs.delete(guildId);

    if (player) {
        player.stop(true);
    }

    players.delete(guildId);
    queues.delete(guildId);

    if (connection) {
        connection.destroy();
    }

    await message.reply(
        `⏹️ Musik dihentikan. ${queueCount} lagu dalam queue dihapus.`
    );
}

async function queue(message) {
    const guildId =
        message.guild.id;

    const current =
        currentSongs.get(guildId);

    const queue =
        getQueue(guildId);

    if (!current && !queue.length) {
        await message.reply(
            '📭 Queue kosong.'
        );
        return;
    }

    const lines = [];

    if (current) {
        lines.push(
            `▶️ **Now Playing**\n${current.title}`
        );
    }

    if (queue.length) {
        lines.push(
            '',
            '📋 **Up Next**'
        );

        queue
            .slice(0, 15)
            .forEach((song, index) => {
                lines.push(
                    `${index + 1}. ${song.title}`
                );
            });

        if (queue.length > 15) {
            lines.push(
                `... dan ${queue.length - 15} lagu lainnya.`
            );
        }
    }

    await message.reply(
        lines.join('\n').slice(0, 4000)
    );
}

async function nowPlaying(message) {
    const guildId =
        message.guild.id;

    const current =
        currentSongs.get(guildId);

    const player =
        players.get(guildId);

    if (!current || !player) {
        await message.reply(
            '❌ Tidak ada lagu yang sedang diputar.'
        );
        return;
    }

    let status = 'Idle';

    switch (player.state.status) {
        case AudioPlayerStatus.Playing:
            status = '▶️ Playing';
            break;

        case AudioPlayerStatus.Paused:
            status = '⏸️ Paused';
            break;

        case AudioPlayerStatus.Buffering:
            status = '⏳ Buffering';
            break;
    }

    await message.reply({
        embeds: [
            createMusicEmbed(
                current,
                {
                    title: '🎵 Now Playing',
                    status
                }
            )
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
    resolveSong,
    searchYoutube: yt.searchYoutube,
    createAudioStream: yt.createAudioStream,
    getAudioStream: yt.getAudioStream
};