const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

/**
 * Membaca konfigurasi saat ini dari process.env dan .env
 */
function getConfig() {
    return {
        prefix: process.env.PREFIX || '!',
        port: parseInt(process.env.PORT || '3000', 10),
        welcomeChannelId: process.env.WELCOME_CHANNEL_ID?.trim() || '',
        announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID?.trim() || '',
        roleMenId: process.env.ROLE_MEN_ID?.trim() || '',
        roleWomenId: process.env.ROLE_WOMEN_ID?.trim() || '',
        spotifyClientId: process.env.SPOTIFY_CLIENT_ID?.trim() || '',
        spotifyRedirectUrl: process.env.SPOTIFY_REDIRECT_URL?.trim() || 'http://localhost:3000/callback',
        hasDiscordToken: Boolean(process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim().length > 25),
        hasSpotifySecret: Boolean(process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_CLIENT_SECRET.trim().length > 10),
        hasAdminKey: Boolean(process.env.ADMIN_KEY && process.env.ADMIN_KEY.trim().length > 0),
        // Masked token preview (e.g. "MTU...89aB")
        tokenMasked: process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim().length > 10
            ? `${process.env.DISCORD_TOKEN.trim().slice(0, 6)}••••••••${process.env.DISCORD_TOKEN.trim().slice(-4)}`
            : ''
    };
}

/**
 * Menyimpan pembaruan konfigurasi ke file .env dan memperbarui process.env langsung
 * @param {Object} updates Key-value pasangan yang ingin diperbarui
 */
function updateConfig(updates) {
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    const lines = content.split('\n');
    const existingKeys = new Set();
    const map = {};

    // Normalisasi update keys
    if (updates.prefix !== undefined) map['PREFIX'] = updates.prefix.trim();
    if (updates.port !== undefined && updates.port) map['PORT'] = String(updates.port).trim();
    if (updates.discordToken !== undefined && updates.discordToken.trim()) {
        map['DISCORD_TOKEN'] = updates.discordToken.trim();
    }
    if (updates.welcomeChannelId !== undefined) map['WELCOME_CHANNEL_ID'] = updates.welcomeChannelId.trim();
    if (updates.announcementChannelId !== undefined) map['ANNOUNCEMENT_CHANNEL_ID'] = updates.announcementChannelId.trim();
    if (updates.roleMenId !== undefined) map['ROLE_MEN_ID'] = updates.roleMenId.trim();
    if (updates.roleWomenId !== undefined) map['ROLE_WOMEN_ID'] = updates.roleWomenId.trim();
    if (updates.spotifyClientId !== undefined) map['SPOTIFY_CLIENT_ID'] = updates.spotifyClientId.trim();
    if (updates.spotifyClientSecret !== undefined && updates.spotifyClientSecret.trim()) {
        map['SPOTIFY_CLIENT_SECRET'] = updates.spotifyClientSecret.trim();
    }
    if (updates.spotifyRedirectUrl !== undefined) map['SPOTIFY_REDIRECT_URL'] = updates.spotifyRedirectUrl.trim();
    if (updates.adminKey !== undefined && updates.adminKey.trim()) {
        map['ADMIN_KEY'] = updates.adminKey.trim();
    }

    const updatedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) return line;

        const key = line.substring(0, eqIdx).trim();
        existingKeys.add(key);

        if (Object.prototype.hasOwnProperty.call(map, key)) {
            const val = map[key];
            process.env[key] = val;
            return `${key}='${val}'`;
        }

        return line;
    });

    // Tambahkan keys baru yang belum ada di .env
    for (const [key, val] of Object.entries(map)) {
        if (!existingKeys.has(key)) {
            updatedLines.push(`${key}='${val}'`);
            process.env[key] = val;
        }
    }

    fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
    return getConfig();
}

module.exports = {
    getConfig,
    updateConfig
};
