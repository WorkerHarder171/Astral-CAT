const fs = require('fs');
const fsPromises = require('fs').promises;
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

// Queue dan flag untuk atomic non-blocking write
let isWriting = false;
let pendingWrite = false;

/**
 * Menyimpan data ke file secara atomik dan non-blocking (unique tmp file -> rename)
 * Menjamin file tidak pernah korup jika terjadi crash di tengah proses penulisan.
 */
async function atomicSave() {
    if (isWriting) {
        pendingWrite = true;
        return;
    }

    isWriting = true;
    const tmp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
        const payload = JSON.stringify(settingsCache, null, 2);
        await fsPromises.writeFile(tmp, payload, 'utf8');
        await fsPromises.rename(tmp, filePath);
    } catch (err) {
        console.error('Error menyimpan guilds.json secara atomik:', err);
        await fsPromises.unlink(tmp).catch(() => {});
    } finally {
        isWriting = false;
        if (pendingWrite) {
            pendingWrite = false;
            atomicSave();
        }
    }
}

/**
 * Flush sinkron saat bot dimatikan mendadak (SIGINT/SIGTERM)
 */
function syncSave() {
    const tmp = `${filePath}.${process.pid}.${Date.now()}.sync.tmp`;
    try {
        const payload = JSON.stringify(settingsCache, null, 2);
        fs.writeFileSync(tmp, payload, 'utf8');
        fs.renameSync(tmp, filePath);
    } catch (err) {
        console.error('Error menyimpan guilds.json (sync):', err);
        try {
            if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        } catch {}
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
        atomicSave();
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
    atomicSave();
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
    getAllGuildSettings,
    syncSave
};
