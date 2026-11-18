module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const prefix = '!';
    const commands = [
        {
            category: 'Musik',
            name: `${prefix}play <judul / URL>`,
            aliases: [`${prefix}p`],
            description: 'Memutar audio musik dari YouTube atau lagu/playlist dari Spotify.',
            usage: `${prefix}play Bohemian Rhapsody`
        },
        {
            category: 'Musik',
            name: `${prefix}skip`,
            aliases: [`${prefix}s`],
            description: 'Melompati lagu yang sedang diputar ke lagu berikutnya di antrean.',
            usage: `${prefix}skip`
        },
        {
            category: 'Musik',
            name: `${prefix}pause`,
            aliases: [],
            description: 'Menjeda sementara pemutaran audio musik.',
            usage: `${prefix}pause`
        },
        {
            category: 'Musik',
            name: `${prefix}resume`,
            aliases: [],
            description: 'Melanjutkan kembali lagu yang sedang dijeda.',
            usage: `${prefix}resume`
        },
        {
            category: 'Musik',
            name: `${prefix}stop`,
            aliases: [],
            description: 'Menghentikan pemutaran musik dan membersihkan seluruh antrean lagu.',
            usage: `${prefix}stop`
        },
        {
            category: 'Musik',
            name: `${prefix}leave`,
            aliases: [`${prefix}dc`],
            description: 'Memutuskan sambungan bot dari voice channel server.',
            usage: `${prefix}leave`
        },
        {
            category: 'Musik',
            name: `${prefix}queue`,
            aliases: [`${prefix}q`],
            description: 'Melihat daftar urutan lagu yang berada di dalam antrean.',
            usage: `${prefix}queue`
        },
        {
            category: 'Musik',
            name: `${prefix}nowplaying`,
            aliases: [`${prefix}np`],
            description: 'Menampilkan judul, durasi, dan informasi lagu yang sedang dimainkan.',
            usage: `${prefix}nowplaying`
        },
        {
            category: 'Sambutan (Welcome)',
            name: `${prefix}setup-welcome <#channel>`,
            aliases: [],
            description: 'Mengatur channel tujuan pengiriman kartu banner sambutan member baru.',
            usage: `${prefix}setup-welcome #welcome`
        },
        {
            category: 'Sambutan (Welcome)',
            name: `${prefix}test-welcome`,
            aliases: [`${prefix}testwelcome`],
            description: 'Menguji coba perenderan gambar banner kartu sambutan dengan avatar kamu.',
            usage: `${prefix}test-welcome`
        },
        {
            category: 'Role & Gender',
            name: `${prefix}setup-role [#channel]`,
            aliases: [`${prefix}setup-gender`],
            description: 'Membuat panel tombol interaktif pemilihan role gender (Man ♂️ / Woman ♀️).',
            usage: `${prefix}setup-role #pilih-role`
        },
        {
            category: 'Pengumuman (Admin)',
            name: `${prefix}announce <#channel>`,
            aliases: [`${prefix}announcement`, `${prefix}pengumuman`],
            description: 'Membuka modal template interaktif untuk mempublikasikan pengumuman berformat embed rapi.',
            usage: `${prefix}announce #pengumuman`
        },
        {
            category: 'Pengumuman (Admin)',
            name: `${prefix}announce-all <#channel>`,
            aliases: [],
            description: 'Membuat pengumuman penting yang menyertakan mention broadcast ke semua anggota.',
            usage: `${prefix}announce-all #announcement`
        },
        {
            category: 'Utilitas',
            name: `${prefix}ping`,
            aliases: [`${prefix}cekping`, `${prefix}latency`],
            description: 'Memeriksa kecepatan respon pesan bot dan latensi WebSocket Discord API.',
            usage: `${prefix}ping`
        },
        {
            category: 'Utilitas',
            name: `${prefix}help`,
            aliases: [`${prefix}bantuan`],
            description: 'Menampilkan daftar ringkasan perintah yang tersedia di dalam bot.',
            usage: `${prefix}help`
        }
    ];

    res.json({ prefix, commands });
};
