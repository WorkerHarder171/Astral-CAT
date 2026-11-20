const { PermissionFlagsBits } = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('./guildSettings');

/**
 * Normalisasi string: hilangkan emoji, simbol, dan spasi untuk pencocokan nama yang akurat
 * @param {string} str
 * @returns {string}
 */
function normalizeName(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Mencari role yang sudah ada di server berdasarkan kecocokan kata kunci
 * @param {import('discord.js').Guild} guild
 * @param {string[]} keywords
 * @param {boolean} isMan
 * @returns {import('discord.js').Role|null}
 */
function findExistingRole(guild, keywords, isMan = false) {
    if (!guild || !guild.roles) return null;
    const normalizedKeywords = keywords.map(normalizeName);

    // 1. Cek exact match
    const exactMatch = guild.roles.cache.find(r => {
        if (r.name === '@everyone') return false;
        const normName = normalizeName(r.name);
        if (isMan && (normName.includes('women') || normName.includes('woman') || normName.includes('wanita') || normName.includes('perempuan'))) {
            return false;
        }
        return normalizedKeywords.some(kw => normName === kw);
    });
    if (exactMatch) return exactMatch;

    // 2. Cek partial match (dengan pengecualian khusus untuk role pria)
    return guild.roles.cache.find(r => {
        if (r.name === '@everyone') return false;
        const normName = normalizeName(r.name);
        if (isMan && (normName.includes('women') || normName.includes('woman') || normName.includes('wanita') || normName.includes('perempuan'))) {
            return false;
        }
        return normalizedKeywords.some(kw => normName.includes(kw));
    }) || null;
}

/**
 * Memeriksa apakah seorang member sudah memiliki salah satu role gender di server
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function memberHasGenderRole(member) {
    if (!member || !member.roles) return false;
    const settings = getGuildSettings(member.guild.id);
    const menId = settings.roleMenId;
    const womenId = settings.roleWomenId;

    // 1. Cek berdasarkan ID role yang tersimpan di pengaturan database
    if (menId && member.roles.cache.has(menId)) return true;
    if (womenId && member.roles.cache.has(womenId)) return true;

    // 2. Cek berdasarkan kecocokan nama role yang dimiliki member
    return member.roles.cache.some(r => {
        if (r.name === '@everyone') return false;
        const n = normalizeName(r.name);
        // Role pria (pastikan tidak mengandung kata 'women'/'woman')
        if (['men', 'man', 'pria', 'cowok', 'laki', 'lakilaki'].includes(n) && !n.includes('women') && !n.includes('woman')) {
            return true;
        }
        // Role wanita
        if (['women', 'woman', 'wanita', 'cewek', 'perempuan'].includes(n)) {
            return true;
        }
        return false;
    });
}

/**
 * Mencari atau membuat role gender (Men & Women) secara otomatis dengan hoisting
 * @param {import('discord.js').Guild} guild
 * @param {boolean} isMan
 * @returns {Promise<import('discord.js').Role|null>}
 */
async function resolveOrCreateGenderRole(guild, isMan) {
    if (!guild) return null;
    const settings = getGuildSettings(guild.id);
    const configuredRoleId = isMan ? settings.roleMenId : settings.roleWomenId;

    // 1. Cek jika ID yang tersimpan di guild settings masih valid di server ini
    if (configuredRoleId && guild.roles.cache.has(configuredRoleId)) {
        return guild.roles.cache.get(configuredRoleId);
    }

    // 2. Cek fallback dari .env jika cocok dengan server ini
    const envRoleId = isMan ? process.env.ROLE_MEN_ID?.trim() : process.env.ROLE_WOMEN_ID?.trim();
    if (envRoleId && guild.roles.cache.has(envRoleId)) {
        if (isMan) updateGuildSettings(guild.id, { roleMenId: envRoleId });
        else updateGuildSettings(guild.id, { roleWomenId: envRoleId });
        return guild.roles.cache.get(envRoleId);
    }

    // 3. Cari role yang sudah ada di server berdasarkan nama
    const keywords = isMan
        ? ['man', 'men', 'male', 'pria', 'lakilaki', 'laki', 'cowok']
        : ['woman', 'women', 'female', 'wanita', 'perempuan', 'cewek'];

    let foundRole = findExistingRole(guild, keywords, isMan);

    if (foundRole) {
        if (!foundRole.hoist) {
            await foundRole.edit({ hoist: true }).catch(() => {});
        }
        if (isMan) updateGuildSettings(guild.id, { roleMenId: foundRole.id });
        else updateGuildSettings(guild.id, { roleWomenId: foundRole.id });
        return foundRole;
    }

    // 4. Jika belum ada, otomatis buat role baru jika bot memiliki izin ManageRoles
    const botMember = guild.members.me;
    if (botMember && botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        try {
            foundRole = await guild.roles.create({
                name: isMan ? 'Men ♂️' : 'Women ♀️',
                color: isMan ? 0x3498DB : 0xE91E63,
                hoist: true,
                reason: 'Astral Cat: Otomatis membuat role gender (Tampil di sidebar kanan)'
            });
            console.log(`✅ [RoleManager] Membuat role "${foundRole.name}" (Sidebar aktif) di server: ${guild.name}`);
            if (isMan) updateGuildSettings(guild.id, { roleMenId: foundRole.id });
            else updateGuildSettings(guild.id, { roleWomenId: foundRole.id });
            return foundRole;
        } catch (err) {
            console.error(`Gagal membuat role otomatis di ${guild.name}:`, err.message);
        }
    }

    return null;
}

module.exports = {
    normalizeName,
    findExistingRole,
    memberHasGenderRole,
    resolveOrCreateGenderRole
};
