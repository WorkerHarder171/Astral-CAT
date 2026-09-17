// music.js
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} = require('@discordjs/voice');


const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');
require('dotenv').config();

play.setToken({
    spotify: {
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        refresh_token: '',
        market: 'ID'
    }
});

const queues = new Map();

/**
 * Memutar lagu dari antrean
 */
async function playSong(guildId) {
    const serverQueue = queues.get(guildId);

    if (!serverQueue || serverQueue.songs.length === 0) {
        return;
    }

    const song = serverQueue.songs[0];

    try {
        console.log('Playing Spotify track via stream:', song.title);

        // Ambil stream audio dari play-dl (secara otomatis mencari sumber audio terbaik)
        const stream = await play.stream(song.url, {
            discordPlayerCompatibility: true
        });

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });

        serverQueue.player.play(resource);

    } catch (err) {
        console.error('Stream error:', err);

        serverQueue.songs.shift();
        playSong(guildId);
    }
}

/**
 * Handler command !play
 */
async function handlePlaySpotify(message, args) {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
        return message.reply('❌ Anda harus berada di Voice Channel terlebih dahulu!');
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);

    if (!permissions.has('Connect') || !permissions.has('Speak')) {
        return message.reply('❌ Bot membutuhkan izin **Connect** dan **Speak**!');
    }

    const query = args.join(' ').trim();

    if (!query) {
        return message.reply(
            '❌ Masukkan judul lagu atau link Spotify!\n\n' +
            'Contoh:\n' +
            '`!play NIKI Every Summertime`\n' +
            '`!play https://open.spotify.com/track/...`\n' +
            '`!play https://open.spotify.com/playlist/...`'
        );
    }

    const searchingMsg = await message.reply(`🔎 Mencari **${query}** di Spotify...`);

    try {
        let songsToAdd = [];

        // Cek tipe URL atau query
        const spType = play.sp_validate(query);

        if (spType === 'track') {
            // Jika input berupa link single track Spotify
            const trackInfo = await play.spotify(query);
            songsToAdd.push({
                title: `${trackInfo.name} - ${trackInfo.artists.map(a => a.name).join(', ')}`,
                url: trackInfo.url,
                duration: `${Math.floor(trackInfo.durationInSec / 60)}:${('0' + (trackInfo.durationInSec % 60)).slice(-2)}`,
                thumbnail: trackInfo.thumbnail?.url || null,
                requestedBy: message.author.tag,
                source: 'spotify'
            });
        } else if (spType === 'playlist' || spType === 'album') {
            // Jika input berupa link Playlist atau Album Spotify
            const playlist = await play.spotify(query);
            const allTracks = await playlist.all_tracks();

            for (const trackInfo of allTracks) {
                songsToAdd.push({
                    title: `${trackInfo.name} - ${trackInfo.artists.map(a => a.name).join(', ')}`,
                    url: trackInfo.url,
                    duration: `${Math.floor(trackInfo.durationInSec / 60)}:${('0' + (trackInfo.durationInSec % 60)).slice(-2)}`,
                    thumbnail: trackInfo.thumbnail?.url || null,
                    requestedBy: message.author.tag,
                    source: 'spotify'
                });
            }
        } else {
            // Jika input berupa kata kunci (Search query)
            const searchResults = await play.search(query, {
                source: { spotify: 'track' },
                limit: 1
            });

            if (searchResults && searchResults.length > 0) {
                const trackInfo = searchResults[0];
                songsToAdd.push({
                    title: `${trackInfo.name} - ${trackInfo.artists.map(a => a.name).join(', ')}`,
                    url: trackInfo.url,
                    duration: `${Math.floor(trackInfo.durationInSec / 60)}:${('0' + (trackInfo.durationInSec % 60)).slice(-2)}`,
                    thumbnail: trackInfo.thumbnail?.url || null,
                    requestedBy: message.author.tag,
                    source: 'spotify'
                });
            }
        }

        if (songsToAdd.length === 0) {
            return searchingMsg.edit(`❌ Lagu **${query}** tidak ditemukan di Spotify.`);
        }

        let serverQueue = queues.get(message.guild.id);

        if (!serverQueue) {
            const player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            });

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            });

            serverQueue = {
                textChannel: message.channel,
                voiceChannel,
                connection,
                player,
                songs: []
            };

            queues.set(message.guild.id, serverQueue);

            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                const queue = queues.get(message.guild.id);
                if (!queue) return;

                queue.songs.shift();
                playSong(message.guild.id);
            });

            player.on('error', (err) => {
                console.error('Audio Player Error:', err);
                const queue = queues.get(message.guild.id);
                if (!queue) return;

                queue.songs.shift();
                playSong(message.guild.id);
            });
        }

        const wasEmpty = serverQueue.songs.length === 0;

        // Tambahkan semua lagu yang didapatkan ke dalam antrean
        serverQueue.songs.push(...songsToAdd);

        await searchingMsg.delete().catch(() => {});

        const firstSong = songsToAdd[0];

        const embed = new EmbedBuilder()
            .setColor(0x1DB954) // Warna hijau khas Spotify
            .setTitle(songsToAdd.length > 1 ? '🎧 Spotify Playlist / Album Added' : '🎵 Spotify Music')
            .setDescription(
                songsToAdd.length > 1
                    ? `Menambahkan **${songsToAdd.length} lagu** ke antrean.`
                    : `**[${firstSong.title}](${firstSong.url})**`
            )
            .addFields(
                { name: '⏱️ Durasi', value: firstSong.duration, inline: true },
                { name: '📊 Posisi Antrean', value: `#${serverQueue.songs.length - songsToAdd.length + 1}`, inline: true },
                { name: '👤 Diminta oleh', value: firstSong.requestedBy, inline: true }
            )
            .setThumbnail(firstSong.thumbnail)
            .setFooter({ text: 'Astral CAT Spotify Player' })
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });

        if (wasEmpty) {
            await playSong(message.guild.id);
        }

    } catch (err) {
        console.error('Spotify search error:', err);
        return searchingMsg.edit(`❌ Gagal mencari atau memutar lagu: ${err.message}`);
    }
}

function handleSkipSpotify(message) {
    const serverQueue = queues.get(message.guild.id);

    if (!message.member.voice.channel) {
        return message.reply('❌ Anda harus berada di Voice Channel!');
    }

    if (!serverQueue || !serverQueue.songs.length) {
        return message.reply('❌ Tidak ada lagu yang sedang diputar.');
    }

    const current = serverQueue.songs[0];
    serverQueue.player.stop();

    return message.reply(`⏭️ Skip: **${current.title}**`);
}

function handlePauseSpotify(message) {
    const queue = queues.get(message.guild.id);

    if (!queue) {
        return message.reply('❌ Tidak ada musik yang aktif.');
    }

    queue.player.pause();
    return message.reply('⏸️ Musik dijeda.');
}

function handleResumeSpotify(message) {
    const queue = queues.get(message.guild.id);

    if (!queue) {
        return message.reply('❌ Tidak ada musik yang aktif.');
    }

    queue.player.unpause();
    return message.reply('▶️ Musik dilanjutkan.');
}

function handleStopSpotify(message) {
    const queue = queues.get(message.guild.id);

    if (!queue) {
        return message.reply('❌ Tidak ada musik yang aktif.');
    }

    queue.songs = [];
    queue.player.stop();

    if (queue.connection) {
        queue.connection.destroy();
    }

    queues.delete(message.guild.id);
    return message.reply('⏹️ Musik dihentikan.');
}

function handleQueueSpotify(message) {
    const queue = queues.get(message.guild.id);

    if (!queue || !queue.songs.length) {
        return message.reply('📭 Queue kosong.');
    }

    const description = queue.songs
        .slice(0, 10) // Tampilkan maksimal 10 lagu pertama
        .map((song, index) => `\`${index + 1}.\` [${song.title}](${song.url})`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle('📋 Spotify Queue')
        .setDescription(description + (queue.songs.length > 10 ? `\n\n*...dan ${queue.songs.length - 10} lagu lainnya*` : ''))
        .setFooter({ text: `Total: ${queue.songs.length} lagu` });

    return message.channel.send({ embeds: [embed] });
}

function handleNowPlaying(message) {
    const serverQueue = queues.get(message.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
        return message.reply('❌ Tidak ada lagu yang sedang diputar.');
    }

    const song = serverQueue.songs[0];
    const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTitle('🎵 Sedang Diputar Saat Ini (Spotify)')
        .setDescription(`**[${song.title}](${song.url})**`)
        .addFields(
            { name: '⏱️ Durasi', value: song.duration || 'N/A', inline: true },
            { name: '👤 Diminta oleh', value: song.requestedBy, inline: true }
        )
        .setFooter({ text: 'Astral CAT Spotify Player' })
        .setTimestamp();

    if (song.thumbnail) {
        embed.setThumbnail(song.thumbnail);
    }

    return message.channel.send({ embeds: [embed] });
}

module.exports = {
    handlePlaySpotify,
    handleSkipSpotify,
    handlePauseSpotify,
    handleResumeSpotify,
    handleStopSpotify,
    handleQueueSpotify,
    handleNowPlaying
};