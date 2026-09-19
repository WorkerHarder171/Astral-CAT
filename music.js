const { EmbedBuilder } = require('discord.js');

module.exports = {
    handlePlaySpotify: async (message, args, distube) => {
        const query = args.join(' ');
        if (!query) {
            return message.reply('❌ Masukkan judul lagu atau link (YouTube/Spotify)!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ Kamu harus berada di voice channel terlebih dahulu!');
        }

        // Pesan indikator loading pencarian
        const loadingMsg = await message.reply(`🔍 Mencari lagu **"${query}"**...`);

        try {
            // DisTube secara otomatis mencari di YouTube/Spotify dan langsung memutar hasil terbaik
            await distube.play(voiceChannel, query, {
                member: message.member,
                textChannel: message.channel,
                message,
                searchCooldown: 10,
                searchSongs: 1 
            });

            // Hapus pesan loading setelah lagu berhasil masuk antrean/diputar
            await loadingMsg.delete().catch(() => {});
        } catch (error) {
            console.error('Error DisTube Play:', error);
            await loadingMsg.delete().catch(() => {});

            if (error.errorCode === 'NO_RESULT') {
                return message.reply(`❌ Tidak ditemukan hasil untuk pencarian: **${query}**.`);
            }

            if (error.errorCode === 'SPOTIFY_API_ERROR') {
                return message.reply('❌ Link Spotify ini bersikap private/tidak dapat diakses API. Gunakan kata kunci judul lagu atau link YouTube/Spotify public.');
            }

            message.reply(`❌ Gagal memutar lagu: ${error.message || 'Pastikan bot memiliki izin masuk/berbicara di Voice Channel!'}`);
        }
    },

    handleSkipSpotify: async (message, queue) => {
        try {
            await queue.skip();
            message.reply('⏭️ Lagu berhasil dilewati!');
        } catch (error) {
            message.reply('❌ Tidak ada lagu berikutnya di dalam antrean.');
        }
    },

    handlePauseSpotify: (message, queue) => {
        if (!queue) return message.reply('❌ Tidak ada musik yang sedang diputar.');
        if (queue.paused) {
            return message.reply('⏸️ Musik sudah dalam keadaan dijeda.');
        }
        queue.pause();
        message.reply('⏸️ Musik berhasil dijeda!');
    },

    handleResumeSpotify: (message, queue) => {
        if (!queue) return message.reply('❌ Tidak ada musik yang sedang diputar.');
        if (!queue.paused) {
            return message.reply('▶️ Musik sedang berjalan.');
        }
        queue.resume();
        message.reply('▶️ Musik dilanjutkan!');
    },

    handleStopSpotify: (message, queue) => {
        if (!queue) {
            return message.reply('❌ Bot tidak sedang memutar musik di voice channel.');
        }
        queue.stop();
        message.reply('⏹️ Musik dihentikan dan antrean dibersihkan!');
    },

    handleQueueSpotify: (message, queue) => {
        if (!queue || !queue.songs || queue.songs.length === 0) {
            return message.reply('❌ Tidak ada lagu dalam antrean saat ini.');
        }

        const q = queue.songs
            .slice(0, 10)
            .map((song, i) => `${i === 0 ? '▶️ **Sedang Diputar:**' : `**${i}.**`} ${song.name} - \`${song.formattedDuration}\``)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎶 Antrean Musik Server')
            .setDescription(q)
            .setFooter({ text: `Total lagu dalam antrean: ${queue.songs.length}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    },

    handleNowPlaying: (message, queue) => {
        if (!queue || !queue.songs[0]) return message.reply('❌ Tidak ada lagu yang sedang diputar.');

        const song = queue.songs[0];

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Sedang Diputar')
            .setDescription(`[${song.name}](${song.url})`)
            .addFields(
                { name: 'Durasi', value: `\`${queue.formattedCurrentTime} / ${song.formattedDuration}\``, inline: true },
                { name: 'Diminta Oleh', value: `${song.user}`, inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }
};