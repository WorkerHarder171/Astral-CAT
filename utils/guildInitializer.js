const { getGuildSettings, updateGuildSettings } = require('./guildSettings');
const { findExistingChannel, autoSetupOnGuildJoin } = require('../commands/auto-setup');
const { resolveOrCreateGenderRole } = require('./roleManager');

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
