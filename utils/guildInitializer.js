const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('./guildSettings');
const { findExistingChannel, findExistingRole, autoSetupOnGuildJoin } = require('../commands/auto-setup');
const welcomeModule = require('../welcome');

/**
 * Mencari atau membuat role gender (Men & Women) secara otomatis
 * @param {import('discord.js').Guild} guild
 * @param {boolean} isMan
 * @returns {Promise<import('discord.js').Role|null>}
 */
async function resolveOrCreateGenderRole(guild, isMan) {
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

    let foundRole = findExistingRole(guild, keywords);

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
                reason: 'Astral Cat: Otomatis membuat role gender untuk kemudahan setup server baru'
            });
            console.log(`✅ [Auto-Setup] Membuat role "${foundRole.name}" (Sidebar aktif) di server: ${guild.name}`);
            if (isMan) updateGuildSettings(guild.id, { roleMenId: foundRole.id });
            else updateGuildSettings(guild.id, { roleWomenId: foundRole.id });
            return foundRole;
        } catch (err) {
            console.error(`Gagal membuat role otomatis di ${guild.name}:`, err.message);
        }
    }

    return null;
}

/**
 * Otomatis mendeteksi channel sambutan terbaik di server (Smart Reuse)
 * @param {import('discord.js').Guild} guild
 * @returns {import('discord.js').TextChannel|null}
 */
function autoDetectWelcomeChannel(guild) {
    const settings = getGuildSettings(guild.id);
    if (settings.welcomeChannelId) {
        const ch = guild.channels.cache.get(settings.welcomeChannelId);
        if (ch && ch.isTextBased()) return ch;
    }

    const channelNames = ['welcome', 'selamatdatang', 'sambutan', 'welcomer', 'memberbaru', 'general', 'chat', 'utama', 'lounge'];
    let target = findExistingChannel(guild, channelNames);

    if (!target && guild.systemChannel && guild.systemChannel.isTextBased()) {
        target = guild.systemChannel;
    }

    if (target) {
        updateGuildSettings(guild.id, { welcomeChannelId: target.id });
    }

    return target || null;
}

/**
 * Otomatis mendeteksi channel pengumuman di server (Smart Reuse)
 * @param {import('discord.js').Guild} guild
 * @returns {import('discord.js').TextChannel|null}
 */
function autoDetectAnnouncementChannel(guild) {
    const settings = getGuildSettings(guild.id);
    if (settings.announcementChannelId) {
        const ch = guild.channels.cache.get(settings.announcementChannelId);
        if (ch && ch.isTextBased()) return ch;
    }

    const channelNames = ['pengumuman', 'announcement', 'announcements', 'info', 'news', 'broadcast'];
    const target = findExistingChannel(guild, channelNames);

    if (target) {
        updateGuildSettings(guild.id, { announcementChannelId: target.id });
    }

    return target || null;
}

/**
 * Menginisialisasi server secara otomatis (Zero-Config Onboarding)
 * @param {import('discord.js').Guild} guild
 * @param {Object} options
 * @param {boolean} options.sendGreeting - Apakah mengirim embed sapaan saat baru bergabung
 */
async function autoInitializeGuild(guild, { sendGreeting = true } = {}) {
    try {
        console.log(`⚙️  [Onboarding] Menginisialisasi server: ${guild.name} (${guild.id})...`);

        // 1. Pastikan record settings tersimpan
        const settings = getGuildSettings(guild.id);

        // 2. Proteksi Anti-Redundansi One-Time Setup:
        // Jika server sudah pernah disetup sebelumnya, JANGAN jalankan auto-setup lagi!
        if (settings.autoSetupCompleted) {
            console.log(`🔒 [Onboarding] Server "${guild.name}" sudah pernah disetup sebelumnya (One-Time Lock aktif). Auto-setup dilewati.`);
            return;
        }

        console.log(`🚀 [Onboarding] Menjalankan auto-setup di channel bot untuk: "${guild.name}"...`);
        await autoSetupOnGuildJoin(guild);

        console.log(`🔒 [Onboarding] Server "${guild.name}" sudah pernah disetup sebelumnya (One-Time Lock aktif).`);
    } catch (error) {
        console.error(`Error inisialisasi server ${guild.name}:`, error);
    }
}

/**
 * Menginisialisasi semua server yang saat ini terhubung ke bot
 * @param {import('discord.js').Client} client
 */
async function autoInitializeAllGuilds(client) {
    const guilds = Array.from(client.guilds.cache.values());
    console.log(`🔄 Menginisialisasi ${guilds.length} server terhubung...`);

    for (const guild of guilds) {
        await autoInitializeGuild(guild, { sendGreeting: false });
    }

    console.log(`✅ Seluruh ${guilds.length} server berhasil disinkronisasi & siap digunakan!`);
}

module.exports = {
    resolveOrCreateGenderRole,
    autoDetectWelcomeChannel,
    autoDetectAnnouncementChannel,
    autoInitializeGuild,
    autoInitializeAllGuilds
};
