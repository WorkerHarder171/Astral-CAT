const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const { updateGuildSettings } = require('../utils/guildSettings');
const { createRolePanel } = require('./claim-role');

/**
 * Menjalankan auto-setup seluruh channel dan role yang dibutuhkan Astral Cat
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} executorMember
 * @returns {Promise<EmbedBuilder>}
 */
async function executeAutoSetup(guild, executorMember) {
    const botMember = guild.members.me;

    // 1. Validasi Izin Bot
    if (!botMember.permissions.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])) {
        return new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Izin Bot Tidak Mencukupi')
            .setDescription([
                'Bot memerlukan izin berikut untuk melakukan auto-setup otomatis:',
                '• **Manage Roles** (Kelola Peran)',
                '• **Manage Channels** (Kelola Saluran)',
                '',
                '👉 Berikan izin **Administrator** atau kedua izin di atas pada role bot **Astral Cat**, lalu coba lagi.'
            ].join('\n'));
    }

    const logSteps = [];

    /*
    |--------------------------------------------------------------------------
    | A. ROLE GENDER (Men & Women)
    |--------------------------------------------------------------------------
    */
    let menRole = guild.roles.cache.find(r =>
        ['men', 'man', 'pria', 'laki-laki'].some(k => r.name.toLowerCase().includes(k))
    );
    if (!menRole) {
        menRole = await guild.roles.create({
            name: 'Men ♂️',
            color: 0x3498DB,
            reason: 'Astral Cat: Auto-Setup Role Gender'
        });
        logSteps.push(`✅ Dibuat role baru: **${menRole.name}**`);
    } else {
        logSteps.push(`ℹ️ Menggunakan role yang ada: **${menRole.name}**`);
    }

    let womenRole = guild.roles.cache.find(r =>
        ['women', 'woman', 'wanita', 'perempuan'].some(k => r.name.toLowerCase().includes(k))
    );
    if (!womenRole) {
        womenRole = await guild.roles.create({
            name: 'Women ♀️',
            color: 0xE91E63,
            reason: 'Astral Cat: Auto-Setup Role Gender'
        });
        logSteps.push(`✅ Dibuat role baru: **${womenRole.name}**`);
    } else {
        logSteps.push(`ℹ️ Menggunakan role yang ada: **${womenRole.name}**`);
    }

    /*
    |--------------------------------------------------------------------------
    | B. CHANNEL SAMBUTAN (Welcome Channel)
    |--------------------------------------------------------------------------
    */
    let welcomeChannel = guild.channels.cache.find(c =>
        c.isTextBased() && ['welcome', 'selamat-datang', 'sambutan'].some(k => c.name.toLowerCase().includes(k))
    );
    if (!welcomeChannel) {
        welcomeChannel = await guild.channels.create({
            name: '👋・selamat-datang',
            type: ChannelType.GuildText,
            topic: 'Channel sambutan resmi anggota baru oleh Astral Cat',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                    deny: [PermissionFlagsBits.SendMessages]
                },
                {
                    id: botMember.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks
                    ]
                }
            ]
        });
        logSteps.push(`✅ Dibuat channel: <#${welcomeChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel sambutan: <#${welcomeChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | C. CHANNEL PILIH ROLE (Gender Selection Panel)
    |--------------------------------------------------------------------------
    */
    let roleChannel = guild.channels.cache.find(c =>
        c.isTextBased() && ['pilih-role', 'claim-role', 'roles', 'ambil-role'].some(k => c.name.toLowerCase().includes(k))
    );
    let sentRolePanel = false;
    if (!roleChannel) {
        roleChannel = await guild.channels.create({
            name: '🚻・pilih-role',
            type: ChannelType.GuildText,
            topic: 'Pilih role gender kamu dengan menekan tombol interaktif di bawah',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                    deny: [PermissionFlagsBits.SendMessages]
                },
                {
                    id: botMember.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks
                    ]
                }
            ]
        });
        const panel = await createRolePanel(guild);
        await roleChannel.send(panel);
        sentRolePanel = true;
        logSteps.push(`✅ Dibuat channel & panel tombol: <#${roleChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel role: <#${roleChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | D. CHANNEL PENGUMUMAN (Announcement Channel)
    |--------------------------------------------------------------------------
    */
    let announceChannel = guild.channels.cache.find(c =>
        c.isTextBased() && ['pengumuman', 'announcement', 'announcements'].some(k => c.name.toLowerCase().includes(k))
    );
    if (!announceChannel) {
        announceChannel = await guild.channels.create({
            name: '📢・pengumuman',
            type: ChannelType.GuildText,
            topic: 'Pengumuman resmi server dari admin Astral Cat',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                    deny: [PermissionFlagsBits.SendMessages]
                },
                {
                    id: botMember.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.MentionEveryone
                    ]
                }
            ]
        });
        logSteps.push(`✅ Dibuat channel pengumuman: <#${announceChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel pengumuman: <#${announceChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | E. VOICE ROOM MUSIK (Optional Lounge)
    |--------------------------------------------------------------------------
    */
    let musicVoice = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildVoice && ['music', 'musik', 'lounge', 'voice'].some(k => c.name.toLowerCase().includes(k))
    );
    if (!musicVoice) {
        musicVoice = await guild.channels.create({
            name: '🎵 │ Music Lounge',
            type: ChannelType.GuildVoice,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak
                    ]
                }
            ]
        });
        logSteps.push(`✅ Dibuat voice room: <#${musicVoice.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | F. SIMPAN SEMUA KONFIGURASI KE GUILD SETTINGS
    |--------------------------------------------------------------------------
    */
    updateGuildSettings(guild.id, {
        welcomeChannelId: welcomeChannel.id,
        announcementChannelId: announceChannel.id,
        roleMenId: menRole.id,
        roleWomenId: womenRole.id
    });

    const reportEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✨ Server Berhasil Menyesuaikan Astral Cat!')
        .setDescription([
            `Semua fitur Astral Cat kini telah diatur otomatis untuk **${guild.name}**.`,
            '',
            '### 📋 Hasil Auto-Setup:',
            `• 🚻 **Role Gender:** ${menRole} & ${womenRole}`,
            `• 👋 **Channel Sambutan:** <#${welcomeChannel.id}> *(Banner kanvas otomatis)*`,
            `• 🎫 **Panel Pilih Role:** <#${roleChannel.id}> *(Siap diklik member)*`,
            `• 📢 **Pengumuman Admin:** <#${announceChannel.id}>`,
            `• 🎵 **Voice Room Musik:** <#${musicVoice.id}>`,
            '',
            '### 💡 Langkah Terakhir Admin (Penting!):',
            'Buka **Server Settings > Roles**, lalu **tarik role "Astral Cat" ke atas** (melebihi role Men & Women) agar bot memiliki wewenang memberikan role.',
            '',
            'Semua perintah kini siap digunakan langsung!'
        ].join('\n'))
        .setThumbnail(guild.iconURL({ dynamic: true }) || undefined)
        .setFooter({ text: `Auto-Setup selesai • Dijalankan oleh ${executorMember.user.tag}` })
        .setTimestamp();

    return reportEmbed;
}

/**
 * Handle command !auto-setup atau !setup-all
 */
async function handleAutoSetupCommand(message) {
    if (
        !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return message.reply('❌ Kamu memerlukan izin **Manage Server** atau **Administrator** untuk menjalankan auto-setup.');
    }

    const waitMsg = await message.reply('⚡ Sedang mengonfigurasi server secara otomatis (membuat role & channel)...');

    try {
        const resultEmbed = await executeAutoSetup(message.guild, message.member);
        await waitMsg.edit({ content: null, embeds: [resultEmbed] });
    } catch (err) {
        console.error('Error saat auto-setup:', err);
        await waitMsg.edit(`❌ Terjadi kesalahan saat auto-setup: ${err.message}`);
    }
}

module.exports = {
    executeAutoSetup,
    handleAutoSetupCommand
};
