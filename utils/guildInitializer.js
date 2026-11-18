const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('./guildSettings');
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
        ? ['man', 'men', 'male', 'pria', 'laki-laki', 'laki', 'cowok']
        : ['woman', 'women', 'female', 'wanita', 'perempuan', 'cewek'];

    let foundRole = guild.roles.cache.find(r =>
        keywords.some(kw => r.name.toLowerCase().trim() === kw || r.name.toLowerCase().includes(kw))
    );

    if (foundRole) {
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
                reason: 'Astral Cat: Otomatis membuat role gender untuk kemudahan setup server baru'
            });
            console.log(`✅ [Auto-Setup] Membuat role "${foundRole.name}" di server: ${guild.name}`);
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
 * Otomatis mendeteksi channel sambutan terbaik di server
 * @param {import('discord.js').Guild} guild
 * @returns {import('discord.js').TextChannel|null}
 */
function autoDetectWelcomeChannel(guild) {
    const settings = getGuildSettings(guild.id);
    if (settings.welcomeChannelId) {
        const ch = guild.channels.cache.get(settings.welcomeChannelId);
        if (ch && ch.isTextBased()) return ch;
    }

    const channelNames = ['welcome', 'selamat-datang', 'sambutan', 'general', 'chat', 'utama', 'lounge'];
    let target = guild.channels.cache.find(c =>
        c.isTextBased() && channelNames.some(name => c.name.toLowerCase().includes(name))
    );

    if (!target && guild.systemChannel && guild.systemChannel.isTextBased()) {
        target = guild.systemChannel;
    }

    if (target) {
        updateGuildSettings(guild.id, { welcomeChannelId: target.id });
    }

    return target || null;
}

/**
 * Otomatis mendeteksi channel pengumuman di server
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
    const target = guild.channels.cache.find(c =>
        c.isTextBased() && channelNames.some(name => c.name.toLowerCase().includes(name))
    );

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
        getGuildSettings(guild.id);

        // 2. Deteksi channel
        const welcomeCh = autoDetectWelcomeChannel(guild);
        const announceCh = autoDetectAnnouncementChannel(guild);

        // 3. Resolusi role gender (Men & Women)
        await resolveOrCreateGenderRole(guild, true);
        await resolveOrCreateGenderRole(guild, false);

        // 4. Jika diminta, kirim kartu sapaan dan tombol onboarding cepat
        if (sendGreeting) {
            const targetChannel =
                guild.systemChannel ||
                guild.channels.cache.find(c =>
                    c.isTextBased() &&
                    c.permissionsFor(guild.members.me)?.has([
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks
                    ])
                );

            if (targetChannel && targetChannel.isTextBased()) {
                const prefix = process.env.PREFIX || '!';
                const botAvatar = guild.client.user.displayAvatarURL({ dynamic: true });

                const embed = new EmbedBuilder()
                    .setColor(0x7C3AED)
                    .setTitle('🐾 Halo! Astral Cat Siap Digunakan')
                    .setDescription([
                        `Terima kasih telah menambahkan **Astral Cat** ke server **${guild.name}**!`,
                        '',
                        '✨ **Semua fitur langsung aktif otomatis tanpa perlu konfigurasi:**',
                        '',
                        `• 🎵 **Musik Bebas Delay:** Masuk voice channel lalu ketik \`${prefix}play <lagu>\` atau \`/play\``,
                        `• 🚻 **Role Gender Otomatis:** Role *Men ♂️* dan *Women ♀️* sudah siap! Pasang panel dengan \`${prefix}setup-role\` atau klik tombol di bawah.`,
                        `• 🎨 **Kartu Sambutan Anggota:** Otomatis dikirim ke ${welcomeCh ? `<#${welcomeCh.id}>` : 'channel sambutan'} saat ada member baru masuk.`,
                        `• 📢 **Pengumuman Elegan:** Kirim pengumuman ber-template ke ${announceCh ? `<#${announceCh.id}>` : 'channel pengumuman'} via \`${prefix}announce\``,
                        `• ⚡ **Slash Command Modern:** Bot ini mendukung Slash Commands (\`/\`). Ketik \`/\` untuk melihat daftar perintah.`,
                        '',
                        '👇 *Gunakan tombol pintas di bawah untuk memasang fitur 1-klik:*'
                    ].join('\n'))
                    .setThumbnail(botAvatar)
                    .setFooter({
                        text: 'Astral Cat Community Bot • Zero Configuration Ready'
                    })
                    .setTimestamp();

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`quick_auto_setup:${guild.id}`)
                        .setLabel('Auto-Setup Server (1-Klik)')
                        .setEmoji('⚡')
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId(`quick_setup_role:${guild.id}`)
                        .setLabel('Pasang Panel Role')
                        .setEmoji('🚻')
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId(`quick_test_welcome:${guild.id}`)
                        .setLabel('Tes Welcome Card')
                        .setEmoji('🎨')
                        .setStyle(ButtonStyle.Secondary),

                    new ButtonBuilder()
                        .setCustomId(`quick_help:${guild.id}`)
                        .setLabel('Buku Panduan')
                        .setEmoji('📖')
                        .setStyle(ButtonStyle.Secondary)
                );

                await targetChannel.send({
                    embeds: [embed],
                    components: [actionRow]
                }).catch(() => {});
            }
        }

        console.log(`🎉 [Onboarding] Server "${guild.name}" siap digunakan 100%!`);
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
