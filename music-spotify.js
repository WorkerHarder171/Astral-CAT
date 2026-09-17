const play = require('play-dl');

async function getSpotifyTrack(url) {
    const type = play.sp_validate(url);

    if (type !== 'track') {
        throw new Error(
            'URL harus berupa Spotify Track.'
        );
    }

    const track = await play.spotify(url);

    const title = track.name;

    const artist = track.artists
        .map(artist => artist.name)
        .join(', ');

    return {
        title,
        artist,
        searchQuery: `${title} ${artist}`,
        spotifyUrl: url
    };
}

async function handleSpotify(message, args) {
    const query = args.join(' ').trim();

    if (!query) {
        return message.reply(
            '❌ Masukkan URL Spotify.\n\n' +
            '`!spotify https://open.spotify.com/track/xxxxx`'
        );
    }

    if (
        !query.includes(
            'open.spotify.com'
        )
    ) {
        return message.reply(
            '❌ URL tersebut bukan URL Spotify.'
        );
    }

    const loading = await message.reply(
        '🟢 Membaca informasi Spotify...'
    );

    try {
        const track =
            await getSpotifyTrack(query);

        const results =
            await play.search(
                track.searchQuery,
                {
                    limit: 1
                }
            );

        if (!results.length) {
            return loading.edit(
                `❌ **${track.title}** tidak ditemukan di YouTube.`
            );
        }

        const video = results[0];

        await loading.edit(
            `🟢 **Spotify:** ${track.title} - ${track.artist}\n` +
            `🔴 **YouTube:** ${video.title}\n\n` +
            `▶️ Gunakan \`!play ${video.url}\` untuk memutarnya.`
        );

    } catch (err) {
        console.error(
            'Spotify error:',
            err
        );

        return loading.edit(
            `❌ Spotify error: ${err.message}`
        );
    }
}

module.exports = {
    handleSpotify,
    getSpotifyTrack
};