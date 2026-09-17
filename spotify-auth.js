const play = require('play-dl');
require('dotenv').config();

async function authorizeSpotify() {
    try {
        console.log('🔄 Memulai otorisasi Spotify menggunakan .env...');

        // Inisialisasi token dengan kredensial dari .env
        await play.setToken({
            spotify: {
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_CLIENT_SECRET,
                redirect_url: process.env.SPOTIFY_REDIRECT_URL,
                market: 'ID'
            }
        });

        // Menjalankan proses OAUTH2 untuk menghasilkan file token
        await play.authorization();

        console.log('✅ Otorisasi Spotify Berhasil!');
    } catch (error) {
        console.error('❌ Terjadi kesalahan saat otorisasi:', error);
    }
}

authorizeSpotify();