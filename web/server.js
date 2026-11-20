const express = require('express');
const path = require('path');
const { getConfig, updateConfig } = require('./configManager');
const welcomeModule = require('../welcome');
const { getCommandsCatalog } = require('../config/commandsCatalog');

let discordClient = null;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Middleware autentikasi admin untuk endpoint mutasi pengaturan
 */
function requireAdminAuth(req, res, next) {
    const configuredKey = process.env.ADMIN_KEY?.trim();
    if (configuredKey) {
        const clientKey = req.headers['x-admin-key'] || req.body?.adminKey;
        if (!clientKey || clientKey !== configuredKey) {
            return res.status(401).json({
                success: false,
                message: 'Akses ditolak: Kunci Admin (Admin Key) tidak valid atau belum diisi.'
            });
        }
    }
    next();
}

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

    const clientId = botUser ? botUser.id : (process.env.DISCORD_CLIENT_ID || '1550009663272128512');
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

    res.json({
        online: isOnline,
        uptime: Math.floor(process.uptime()),
        ping,
        guildCount,
        userCount,
        botUser,
        inviteUrl,
        prefix: process.env.PREFIX || '!'
    });
});

// API: Direct Invite Bot Link
app.get('/api/invite', (req, res) => {
    const clientId = (discordClient && discordClient.user) ? discordClient.user.id : (process.env.DISCORD_CLIENT_ID || '1550009663272128512');
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    res.json({ success: true, clientId, inviteUrl });
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
app.post('/api/settings', requireAdminAuth, (req, res) => {
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

// API: List Guilds (Multi-Server)
app.get('/api/guilds', (req, res) => {
    if (!discordClient || !discordClient.isReady || !discordClient.isReady()) {
        return res.json({ guilds: [] });
    }

    const { getAllGuildSettings } = require('../utils/guildSettings');
    const allSettings = getAllGuildSettings();

    const guilds = discordClient.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ dynamic: true, size: 128 }),
        memberCount: g.memberCount,
        settings: allSettings[g.id] || {}
    }));

    res.json({ guilds });
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
    res.json({ prefix, commands: getCommandsCatalog(prefix) });
});

/**
 * Memulai Express Web Server
 * @param {import('discord.js').Client} client Discord Client instance
 * @returns {import('http').Server}
 */
function startWebServer(client) {
    discordClient = client;
    const initialPort = parseInt(process.env.PORT || '3000', 10);
    const maxPortAttempts = 5;

    return new Promise((resolve) => {
        function tryListen(port, attempt = 0) {
            const server = app.listen(port, () => {
                console.log('========================================');
                console.log(`🌐 Dashboard Website aktif di: http://localhost:${port}`);
                console.log(`📜 Privacy Policy tersedia di: http://localhost:${port}/privacy`);
                console.log(`⚙️  Pengaturan Bot tersedia di: http://localhost:${port}/settings`);
                console.log('========================================');
                resolve(server);
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    if (attempt < maxPortAttempts) {
                        console.warn(`⚠️  Port ${port} sedang digunakan aplikasi lain. Mencoba port alternatif: ${port + 1}...`);
                        tryListen(port + 1, attempt + 1);
                    } else {
                        console.warn(`⚠️  Seluruh port dashboard (${initialPort}-${port}) sedang digunakan. Web dashboard dilewati.`);
                        resolve(null);
                    }
                } else {
                    console.error('❌ Web server error:', err);
                    resolve(null);
                }
            });
        }

        tryListen(initialPort);
    });
}

module.exports = {
    app,
    startWebServer
};
