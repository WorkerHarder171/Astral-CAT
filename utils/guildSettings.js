const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '.data');
const filePath = path.join(dataDir, 'guilds.json');

// Pastikan folder .data ada
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let settingsCache = {};

try {
    if (fs.existsSync(filePath)) {
        settingsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
} catch (err) {
    console.error('Error membaca guilds.json:', err);
    settingsCache = {};
}

function save() {
    try {
        fs.writeFileSync(filePath, JSON.stringify(settingsCache, null, 2), 'utf8');
    } catch (err) {
        console.error('Error menyimpan guilds.json:', err);
    }
}

/**
 * Mendapatkan konfigurasi untuk guild tertentu
 * @param {string} guildId
 * @returns {Object}
 */
function getGuildSettings(guildId) {
    if (!guildId) return {};

    if (!settingsCache[guildId]) {
        settingsCache[guildId] = {
            welcomeChannelId: '',
            announcementChannelId: '',
            roleMenId: '',
            roleWomenId: '',
            prefix: process.env.PREFIX || '!'
        };
        save();
    }
    return settingsCache[guildId];
}

/**
 * Memperbarui pengaturan guild tertentu
 * @param {string} guildId
 * @param {Object} updates
 * @returns {Object}
 */
function updateGuildSettings(guildId, updates) {
    if (!guildId) return {};
    const current = getGuildSettings(guildId);
    settingsCache[guildId] = { ...current, ...updates };
    save();
    return settingsCache[guildId];
}

/**
 * Mendapatkan seluruh data settings guild
 */
function getAllGuildSettings() {
    return settingsCache;
}

module.exports = {
    getGuildSettings,
    updateGuildSettings,
    getAllGuildSettings
};
