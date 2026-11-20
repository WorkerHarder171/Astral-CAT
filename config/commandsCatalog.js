/**
 * Katalog terpusat daftar perintah dan metadata Astral Cat
 * Digunakan secara konsisten oleh Web Dashboard, Express API, dan Discord Help Command.
 */

function getCommandsCatalog(prefix = '!') {
    return [
        {
            category: 'Musik',
            name: `${prefix}play <judul / URL>`,
            aliases: [`${prefix}p`],
            slash: '/play lagu:<judul/url>',
            description: 'Memutar audio musik dari YouTube atau lagu/playlist dari Spotify.',
            usage: `${prefix}play Bohemian Rhapsody`
        },
        {
            category: 'Musik',
            name: `${prefix}skip`,
            aliases: [`${prefix}s`],
            slash: '/skip',
            description: 'Melompati lagu yang sedang diputar ke lagu berikutnya di antrean.',
            usage: `${prefix}skip`
        },
        {
            category: 'Musik',
            name: `${prefix}pause`,
            aliases: [],
            slash: '/pause',
            description: 'Menjeda sementara pemutaran audio musik.',
            usage: `${prefix}pause`
        },
        {
            category: 'Musik',
            name: `${prefix}resume`,
            aliases: [],
            slash: '/resume',
            description: 'Melanjutkan kembali lagu yang sedang dijeda.',
            usage: `${prefix}resume`
        },
        {
            category: 'Musik',
            name: `${prefix}stop`,
            aliases: [],
            slash: '/stop',
            description: 'Menghentikan pemutaran musik dan membersihkan seluruh antrean lagu.',
            usage: `${prefix}stop`
        },
        {
            category: 'Musik',
            name: `${prefix}leave`,
            aliases: [`${prefix}dc`],
            slash: '/stop',
            description: 'Memutuskan sambungan bot dari voice channel server.',
            usage: `${prefix}leave`
        },
        {
            category: 'Musik',
            name: `${prefix}queue`,
            aliases: [`${prefix}q`],
            slash: '/queue',
            description: 'Melihat daftar urutan lagu yang berada di dalam antrean.',
            usage: `${prefix}queue`
        },
        {
            category: 'Musik',
            name: `${prefix}nowplaying`,
            aliases: [`${prefix}np`],
            slash: '/nowplaying',
            description: 'Menampilkan judul, durasi, dan informasi lagu yang sedang dimainkan.',
            usage: `${prefix}nowplaying`
        },
        {
            category: 'Onboarding & Auto-Setup',
            name: `${prefix}auto-setup [force]`,
            aliases: [`${prefix}autosetup`, `${prefix}setup-all`],
            slash: '/auto-setup [force:True]',
            description: 'Konfigurasi 1-klik zero-config: mendeteksi channel & role yang ada dengan proteksi anti-duplikasi.',
            usage: `${prefix}auto-setup`
        },
        {
            category: 'Sambutan (Welcome)',
            name: `${prefix}setup-welcome <#channel>`,
            aliases: [],
            slash: '/setup-welcome channel:<#channel>',
            description: 'Mengatur channel tujuan pengiriman kartu banner sambutan member baru.',
            usage: `${prefix}setup-welcome #welcome`
        },
        {
            category: 'Sambutan (Welcome)',
            name: `${prefix}test-welcome`,
            aliases: [`${prefix}testwelcome`],
            slash: '/test-welcome',
            description: 'Menguji coba perenderan gambar banner kartu sambutan dengan avatar profil Anda.',
            usage: `${prefix}test-welcome`
        },
        {
            category: 'Role & Gender',
            name: `${prefix}setup-role [#channel]`,
            aliases: [`${prefix}setup-gender`],
            slash: '/setup-role [channel:<#channel>]',
            description: 'Membuat panel tombol interaktif pemilihan role gender (Men ♂️ / Women ♀️).',
            usage: `${prefix}setup-role #pilih-role`
        },
        {
            category: 'Role & Gender',
            name: `${prefix}claim-role`,
            aliases: [`${prefix}dm-role`, `${prefix}pilih-role`],
            slash: '/claim-role',
            description: 'Mengirimkan pesan interaktif pemilihan role langsung ke DM Anda.',
            usage: `${prefix}claim-role`
        },
        {
            category: 'Role & Gender (Admin)',
            name: `${prefix}broadcast-role [semua]`,
            aliases: [],
            slash: '/broadcast-role [semua:True]',
            description: 'Mengirimkan kartu pemilihan role ke DM seluruh anggota lama yang belum memiliki role.',
            usage: `${prefix}broadcast-role`
        },
        {
            category: 'Pengumuman (Admin)',
            name: `${prefix}announce [#channel]`,
            aliases: [`${prefix}announcement`, `${prefix}pengumuman`],
            slash: '/announce [channel:<#channel>]',
            description: 'Membuka modal template interaktif untuk mempublikasikan pengumuman berformat embed elegan.',
            usage: `${prefix}announce #pengumuman`
        },
        {
            category: 'Pengumuman (Admin)',
            name: `${prefix}announce-all [#channel]`,
            aliases: [],
            slash: '/announce semua:True [channel:<#channel>]',
            description: 'Membuat pengumuman penting yang menyertakan mention broadcast ke semua orang (@everyone).',
            usage: `${prefix}announce-all #announcement`
        },
        {
            category: 'Utilitas',
            name: `${prefix}ping`,
            aliases: [`${prefix}cekping`, `${prefix}latency`],
            slash: '/ping',
            description: 'Memeriksa kecepatan respon pesan bot dan latensi WebSocket Discord API.',
            usage: `${prefix}ping`
        },
        {
            category: 'Utilitas',
            name: `${prefix}help`,
            aliases: [`${prefix}bantuan`],
            slash: '/help',
            description: 'Menampilkan buku panduan lengkap fitur dan ringkasan perintah yang tersedia di dalam bot.',
            usage: `${prefix}help`
        }
    ];
}

module.exports = {
    getCommandsCatalog
};
