const express = require('express');
const path = require('path');
const { getConfig, updateConfig } = require('./configManager');
const welcomeModule = require('../welcome');

let discordClient = null;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// HTML Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// API: Bot Live Status
app.get('/api/status', (req, res) => {
    const isOnline = Boolean(discordClient && discordClient.isReady && discordClient.isReady());
    
    let guildCount = 0;
    let userCount = 0;
    let ping = -1;
    let botUser = null;

    if (isOnline && discordClient) {
        guildCount = discordClient.guilds.cache.size;
        userCount = discordClient.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
        ping = Math.round(discordClient.ws.ping);
        botUser = {
            id: discordClient.user.id,
            username: discordClient.user.username,
            tag: discordClient.user.tag,
            avatar: discordClient.user.displayAvatarURL({ dynamic: true, size: 256 })
        };
    }

    res.json({
        online: isOnline,
        uptime: Math.floor(process.uptime()),
        ping,
        guildCount,
        userCount,
        botUser,
        prefix: process.env.PREFIX || '!'
    });
});

// API: Get Current Config
app.get('/api/settings', (req, res) => {
    try {
        const config = getConfig();
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Update Config
app.post('/api/settings', (req, res) => {
    try {
        const updated = updateConfig(req.body);
        res.json({
            success: true,
            message: 'Pengaturan berhasil disimpan!',
            config: updated
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: List Guild Channels (if bot is connected)
app.get('/api/channels', (req, res) => {
    if (!discordClient || !discordClient.isReady || !discordClient.isReady()) {
        return res.json({ channels: [] });
    }

    const channels = [];
    discordClient.guilds.cache.forEach(guild => {
        guild.channels.cache.forEach(ch => {
            if (ch.isTextBased && ch.isTextBased()) {
                channels.push({
                    id: ch.id,
                    name: ch.name,
                    guildId: guild.id,
                    guildName: guild.name
                });
            }
        });
    });

    res.json({ channels });
});

// API: List Guild Roles (if bot is connected)
app.get('/api/roles', (req, res) => {
    if (!discordClient || !discordClient.isReady || !discordClient.isReady()) {
        return res.json({ roles: [] });
    }

    const roles = [];
    discordClient.guilds.cache.forEach(guild => {
        guild.roles.cache.forEach(role => {
            if (role.name !== '@everyone') {
                roles.push({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    guildId: guild.id,
                    guildName: guild.name
                });
            }
        });
    });

    res.json({ roles });
});

// API: Live Preview Welcome Card
app.get('/api/preview/welcome', async (req, res) => {
    try {
        const username = req.query.username || 'Astral Member';
        const mockMember = {
            user: {
                username,
                tag: `${username}#0001`,
                displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
                defaultAvatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
            },
            guild: {
                name: 'Astral Cat Community',
                iconURL: () => null
            }
        };

        const card = await welcomeModule.generateWelcomeCard(mockMember);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store');
        res.send(card.attachment);
    } catch (error) {
        console.error('Error generating preview welcome card:', error);
        res.status(500).send('Gagal membuat preview banner');
    }
});

// API: List Commands
app.get('/api/commands', (req, res) => {
    const prefix = process.env.PREFIX || '!';
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
});

/**
 * Memulai Express Web Server
 * @param {import('discord.js').Client} client Discord Client instance
 * @returns {import('http').Server}
 */
function startWebServer(client) {
    discordClient = client;
    const port = parseInt(process.env.PORT || '3000', 10);

    const server = app.listen(port, () => {
        console.log('========================================');
        console.log(`🌐 Dashboard Website aktif di: http://localhost:${port}`);
        console.log(`📜 Privacy Policy tersedia di: http://localhost:${port}/privacy`);
        console.log(`⚙️  Pengaturan Bot tersedia di: http://localhost:${port}/settings`);
        console.log('========================================');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️  Port ${port} sedang digunakan. Mencoba port ${port + 1}...`);
            app.listen(port + 1, () => {
                console.log(`🌐 Dashboard Website aktif di: http://localhost:${port + 1}`);
            });
        } else {
            console.error('❌ Web server error:', err);
        }
    });

    return server;
}

module.exports = {
    app,
    startWebServer
};
