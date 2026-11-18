module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        return res.status(200).json({
            success: false,
            message: 'Mode Serverless Vercel bersifat Read-Only (Cloud). Untuk menyimpan konfigurasi langsung ke .env, jalankan bot secara lokal atau di VPS menggunakan `npm start`.'
        });
    }

    res.json({
        success: true,
        config: {
            prefix: process.env.PREFIX || '!',
            port: 3000,
            welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
            announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID || '',
            roleMenId: process.env.ROLE_MEN_ID || '',
            roleWomenId: process.env.ROLE_WOMEN_ID || '',
            spotifyClientId: process.env.SPOTIFY_CLIENT_ID || '',
            spotifyRedirectUrl: process.env.SPOTIFY_REDIRECT_URL || '',
            hasDiscordToken: Boolean(process.env.DISCORD_TOKEN),
            hasSpotifySecret: Boolean(process.env.SPOTIFY_CLIENT_SECRET),
            tokenMasked: process.env.DISCORD_TOKEN ? '••••••••' : ''
        }
    });
};
