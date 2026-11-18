const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../utils/guildSettings');
const { createRolePanel } = require('./claim-role');

/**
 * Normalisasi string: hilangkan emoji, simbol, dan spasi untuk pencocokan nama channel/role yang akurat
 * @param {string} str
 * @returns {string}
 */
function normalizeName(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Mencari channel yang sudah ada di server berdasarkan kecocokan kata kunci
 * @param {import('discord.js').Guild} guild
 * @param {string[]} keywords
 * @param {number} type
 * @returns {import('discord.js').GuildChannel|null}
 */
function findExistingChannel(guild, keywords, type = ChannelType.GuildText) {
    const normalizedKeywords = keywords.map(normalizeName);

    return guild.channels.cache.find(c => {
        // Cek tipe channel (teks atau voice)
        if (type === ChannelType.GuildText && !c.isTextBased()) return false;
        if (type === ChannelType.GuildVoice && c.type !== ChannelType.GuildVoice) return false;

        const normName = normalizeName(c.name);
        return normalizedKeywords.some(kw => normName.includes(kw));
    }) || null;
}

/**
 * Mencari role yang sudah ada di server berdasarkan nama
 * @param {import('discord.js').Guild} guild
 * @param {string[]} keywords
 * @returns {import('discord.js').Role|null}
 */
function findExistingRole(guild, keywords) {
    const normalizedKeywords = keywords.map(normalizeName);

    return guild.roles.cache.find(r => {
        if (r.name === '@everyone') return false;
        const normName = normalizeName(r.name);
        return normalizedKeywords.some(kw => normName === kw || normName.includes(kw));
    }) || null;
}

/**
 * Menjalankan auto-setup seluruh channel dan role yang dibutuhkan Astral Cat
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} executorMember
 * @param {boolean} force - Apakah memaksa jalan ulang jika sudah pernah disetup
 * @returns {Promise<EmbedBuilder>}
 */
async function executeAutoSetup(guild, executorMember, force = false) {
    const botMember = guild.members.me;
    const currentSettings = getGuildSettings(guild.id);

    /*
    |--------------------------------------------------------------------------
    | 1. PERLINDUNGAN SATU KALI EKSEKUSI (ONE-TIME SETUP)
    |--------------------------------------------------------------------------
    | Mencegah duplikasi channel atau reset pengaturan jika sudah pernah di-setup
    */
    if (currentSettings.autoSetupCompleted && !force) {
        return new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('🔒 Auto-Setup Sudah Aktif (One-Time Execution)')
            .setDescription([
                `Server **${guild.name}** sebelumnya sudah berhasil disesuaikan dengan Astral Cat.`,
                '',
                '### 📌 Konfigurasi Aktif Saat Ini:',
                `• 🚻 **Role Men:** ${currentSettings.roleMenId ? `<@&${currentSettings.roleMenId}>` : '*Belum terpasang*'}`,
                `• 🚻 **Role Women:** ${currentSettings.roleWomenId ? `<@&${currentSettings.roleWomenId}>` : '*Belum terpasang*'}`,
                `• 👋 **Channel Sambutan:** ${currentSettings.welcomeChannelId ? `<#${currentSettings.welcomeChannelId}>` : '*Belum terpasang*'}`,
                `• 📢 **Channel Pengumuman:** ${currentSettings.announcementChannelId ? `<#${currentSettings.announcementChannelId}>` : '*Belum terpasang*'}`,
                '',
                '✨ *Bot sudah terhubung dan menggunakan channel di atas tanpa perlu di-setup ulang.*',
                '',
                '💡 **Ingin Memaksa Setup Ulang?**',
                'Ketik `!auto-setup force` atau `/auto-setup force:True` untuk memperbarui paksa seluruh pengaturan.'
            ].join('\n'))
            .setFooter({ text: 'Proteksi Anti-Duplikasi • Astral Cat' })
            .setTimestamp();
    }

    // 2. Validasi Izin Bot
    if (!botMember.permissions.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])) {
        return new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Izin Bot Tidak Mencukupi')
            .setDescription([
                'Bot memerlukan izin berikut untuk mengonfigurasi server secara otomatis:',
                '• **Manage Roles** (Kelola Peran)',
                '• **Manage Channels** (Kelola Saluran)',
                '',
                '👉 Berikan izin **Administrator** atau kedua izin di atas pada role bot **Astral Cat**, lalu coba lagi.'
            ].join('\n'));
    }

    const logSteps = [];

    /*
    |--------------------------------------------------------------------------
    | A. ROLE GENDER (Men & Women) - SMART REUSE OR CREATE
    |--------------------------------------------------------------------------
    */
    let menRole = findExistingRole(guild, ['men', 'man', 'pria', 'lakilaki', 'laki', 'cowok']);
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

    let womenRole = findExistingRole(guild, ['women', 'woman', 'wanita', 'perempuan', 'cewek']);
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
    | B. CHANNEL SAMBUTAN (Welcome Channel) - SMART REUSE OR CREATE
    |--------------------------------------------------------------------------
    */
    let welcomeChannel = findExistingChannel(guild, [
        'welcome',
        'selamatdatang',
        'sambutan',
        'welcomer',
        'memberbaru',
        'join'
    ], ChannelType.GuildText);

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
        logSteps.push(`✅ Dibuat channel baru: <#${welcomeChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Langsung menggunakan channel sambutan yang ada: <#${welcomeChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | C. CHANNEL PILIH ROLE (Gender Selection Panel) - SMART REUSE OR CREATE
    |--------------------------------------------------------------------------
    */
    let roleChannel = findExistingChannel(guild, [
        'pilihrole',
        'claimrole',
        'roles',
        'ambilrole',
        'gender'
    ], ChannelType.GuildText);

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
        // Cek jika panel tombol belum pernah dikirimkan di channel yang ada
        const messages = await roleChannel.messages.fetch({ limit: 10 }).catch(() => null);
        const hasPanel = messages && messages.some(m => m.author.id === botMember.id && m.components.length > 0);
        if (!hasPanel) {
            const panel = await createRolePanel(guild);
            await roleChannel.send(panel);
            sentRolePanel = true;
        }
        logSteps.push(`ℹ️ Langsung menggunakan channel role yang ada: <#${roleChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | D. CHANNEL PENGUMUMAN (Announcement Channel) - SMART REUSE OR CREATE
    |--------------------------------------------------------------------------
    */
    let announceChannel = findExistingChannel(guild, [
        'pengumuman',
        'announcement',
        'announcements',
        'info',
        'news',
        'broadcast'
    ], ChannelType.GuildText);

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
        logSteps.push(`✅ Dibuat channel baru: <#${announceChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Langsung menggunakan channel pengumuman yang ada: <#${announceChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | E. VOICE ROOM MUSIK (Music Lounge) - SMART REUSE OR CREATE
    |--------------------------------------------------------------------------
    */
    let musicVoice = findExistingChannel(guild, [
        'music',
        'musik',
        'lounge',
        'voice',
        'suara'
    ], ChannelType.GuildVoice);

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
    } else {
        logSteps.push(`ℹ️ Langsung menggunakan voice room yang ada: <#${musicVoice.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | F. SIMPAN SEMUA KONFIGURASI KE GUILD SETTINGS (KUNCI SATU KALI EKSEKUSI)
    |--------------------------------------------------------------------------
    */
    updateGuildSettings(guild.id, {
        welcomeChannelId: welcomeChannel.id,
        announcementChannelId: announceChannel.id,
        roleMenId: menRole.id,
        roleWomenId: womenRole.id,
        autoSetupCompleted: true,
        autoSetupDate: new Date().toISOString()
    });

    const reportEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✨ Server Berhasil Menyesuaikan Astral Cat!')
        .setDescription([
            `Semua fitur Astral Cat kini telah diatur otomatis untuk **${guild.name}**.`,
            '',
            '### 📋 Hasil Auto-Setup (Bebas Duplikasi):',
            `• 🚻 **Role Gender:** ${menRole} & ${womenRole}`,
            `• 👋 **Channel Sambutan:** <#${welcomeChannel.id}> *(Banner kanvas otomatis)*`,
            `• 🎫 **Panel Pilih Role:** <#${roleChannel.id}> *(Siap diklik member)*`,
            `• 📢 **Pengumuman Admin:** <#${announceChannel.id}>`,
            `• 🎵 **Voice Room Musik:** <#${musicVoice.id}>`,
            '',
            '### 🔒 Proteksi Pengaturan:',
            'Pengaturan ini **telah dikunci (hanya berjalan 1 kali)** sehingga bot tidak akan membuat channel dobel di masa mendatang.',
            '',
            '### 💡 Langkah Terakhir Admin (Penting!):',
            'Buka **Server Settings > Roles**, lalu **tarik role "Astral Cat" ke atas** (melebihi role Men & Women) agar bot berwenang memberikan role.',
            '',
            'Semua perintah siap digunakan langsung!'
        ].join('\n'))
        .setThumbnail(guild.iconURL({ dynamic: true }) || undefined)
        .setFooter({ text: `Auto-Setup selesai • Dijalankan oleh ${executorMember.user.tag}` })
        .setTimestamp();

    return reportEmbed;
}

/**
 * Handle command !auto-setup atau !setup-all
 */
async function handleAutoSetupCommand(message, args = []) {
    if (
        !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return message.reply('❌ Kamu memerlukan izin **Manage Server** atau **Administrator** untuk menjalankan auto-setup.');
    }

    const force = args[0]?.toLowerCase() === 'force';
    const waitMsg = await message.reply('⚡ Sedang memeriksa dan mengonfigurasi server secara otomatis...');

    try {
        const resultEmbed = await executeAutoSetup(message.guild, message.member, force);
        await waitMsg.edit({ content: null, embeds: [resultEmbed] });
    } catch (err) {
        console.error('Error saat auto-setup:', err);
        await waitMsg.edit(`❌ Terjadi kesalahan saat auto-setup: ${err.message}`);
    }
}

module.exports = {
    normalizeName,
    findExistingChannel,
    findExistingRole,
    executeAutoSetup,
    handleAutoSetupCommand
};
