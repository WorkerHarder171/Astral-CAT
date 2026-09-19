const { EmbedBuilder } = require('discord.js');
const youtubedl = require('yt-dlp-exec');

function isYoutubeUrl(query) {
    try {
        const url = new URL(query);

        return [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'youtu.be'
        ].includes(url.hostname);
    } catch {
        return false;
    }
}

async function searchYoutube(query) {
    const result = await youtubedl(
        `ytsearch1:${query}`,
        {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            flatPlaylist: true
        }
    );

    if (!result) {
        throw new Error('Tidak ada hasil pencarian YouTube.');
    }

    let video = result;

    if (result.entries && result.entries.length > 0) {
        video = result.entries[0];
    }

    if (!video) {
        throw new Error('Video tidak ditemukan.');
    }

    if (video.webpage_url) {
        return video.webpage_url;
    }

    if (video.url && video.url.startsWith('http')) {
        return video.url;
    }

    if (video.id) {
        return `https://www.youtube.com/watch?v=${video.id}`;
    }

    throw new Error('URL video tidak ditemukan.');
}

module.exports = {
    handlePlayYoutube: async (message, args, distube) => {
        const query = args.join(' ').trim();

        if (!query) {
            return message.reply(
                '❌ Masukkan judul lagu atau link YouTube!'
            );
        }

        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply(
                '❌ Kamu harus berada di voice channel terlebih dahulu!'
            );
        }

        const loadingMsg = await message.reply(
            `🔍 Mencari lagu **"${query}"** di YouTube...`
        );

        try {
            let videoUrl = query;

            /*
             * Jika input bukan URL YouTube,
             * lakukan pencarian menggunakan yt-dlp.
             *
             * Dengan demikian @distube/ytsr tidak digunakan.
             */
            if (!isYoutubeUrl(query)) {
                console.log(`Searching YouTube with yt-dlp: ${query}`);

                videoUrl = await searchYoutube(query);

                console.log(`YouTube result: ${videoUrl}`);
            }

            console.log(`Playing YouTube: ${videoUrl}`);

            await distube.play(
                voiceChannel,
                videoUrl,
                {
                    member: message.member,
                    textChannel: message.channel,
                    message
                }
            );

            await loadingMsg.delete().catch(() => {});
        } catch (error) {
            console.error(
                'Error DisTube Play:',
                error
            );

            await loadingMsg.delete().catch(() => {});

            return message.reply(
                `❌ Gagal memutar lagu: ${
                    error.message ||
                    'Terjadi kesalahan ketika mengambil audio YouTube.'
                }`
            );
        }
    },

    handleSkipYoutube: async (message, queue) => {
        try {
            await queue.skip();

            return message.reply(
                '⏭️ Lagu berhasil dilewati!'
            );
        } catch (error) {
            return message.reply(
                '❌ Tidak ada lagu berikutnya di dalam antrean.'
            );
        }
    },

    handlePauseYoutube: (message, queue) => {
        if (!queue) {
            return message.reply(
                '❌ Tidak ada musik yang sedang diputar.'
            );
        }

        if (queue.paused) {
            return message.reply(
                '⏸️ Musik sudah dalam keadaan dijeda.'
            );
        }

        queue.pause();

        return message.reply(
            '⏸️ Musik berhasil dijeda!'
        );
    },

    handleResumeYoutube: (message, queue) => {
        if (!queue) {
            return message.reply(
                '❌ Tidak ada musik yang sedang diputar.'
            );
        }

        if (!queue.paused) {
            return message.reply(
                '▶️ Musik sedang berjalan.'
            );
        }

        queue.resume();

        return message.reply(
            '▶️ Musik dilanjutkan!'
        );
    },

    handleStopYoutube: (message, queue) => {
        if (!queue) {
            return message.reply(
                '❌ Bot tidak sedang memutar musik di voice channel.'
            );
        }

        queue.stop();

        return message.reply(
            '⏹️ Musik dihentikan dan antrean dibersihkan!'
        );
    },

    handleQueueYoutube: (message, queue) => {
        if (
            !queue ||
            !queue.songs ||
            queue.songs.length === 0
        ) {
            return message.reply(
                '❌ Tidak ada lagu dalam antrean saat ini.'
            );
        }

        const q = queue.songs
            .slice(0, 10)
            .map((song, i) => {
                if (i === 0) {
                    return (
                        `▶️ **Sedang Diputar:** ` +
                        `${song.name} - \`${song.formattedDuration}\``
                    );
                }

                return (
                    `**${i}.** ${song.name} - ` +
                    `\`${song.formattedDuration}\``
                );
            })
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🎶 Antrean Musik YouTube')
            .setDescription(q)
            .setFooter({
                text:
                    `Total lagu dalam antrean: ` +
                    `${queue.songs.length}`
            })
            .setTimestamp();

        return message.channel.send({
            embeds: [embed]
        });
    },

    handleNowPlaying: (message, queue) => {
        if (
            !queue ||
            !queue.songs ||
            !queue.songs[0]
        ) {
            return message.reply(
                '❌ Tidak ada lagu yang sedang diputar.'
            );
        }

        const song = queue.songs[0];

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🎵 Sedang Diputar (YouTube)')
            .setDescription(
                `[${song.name}](${song.url})`
            )
            .addFields(
                {
                    name: 'Durasi',
                    value:
                        `\`${queue.formattedCurrentTime} / ` +
                        `${song.formattedDuration}\``,
                    inline: true
                },
                {
                    name: 'Diminta Oleh',
                    value: `${song.user}`,
                    inline: true
                }
            )
            .setTimestamp();

        if (song.thumbnail) {
            embed.setThumbnail(song.thumbnail);
        }

        return message.channel.send({
            embeds: [embed]
        });
    }
};