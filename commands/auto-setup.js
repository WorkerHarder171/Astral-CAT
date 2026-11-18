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
        if (type === ChannelType.GuildText && !c.isTextBased()) return false;
        if (type === ChannelType.GuildVoice && c.type !== ChannelType.GuildVoice) return false;

        const normName = normalizeName(c.name);
        return normalizedKeywords.some(kw => normName === kw || normName.includes(kw));
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
 * @param {import('discord.js').GuildMember|null} executorMember
 * @param {boolean} force - Apakah memaksa jalan ulang jika sudah pernah disetup
 * @returns {Promise<EmbedBuilder>}
 */
async function executeAutoSetup(guild, executorMember, force = false) {
    const botMember = guild.members.me;
    const currentSettings = getGuildSettings(guild.id);

    // Cek keberadaan channel yang sudah dikonfigurasi
    const hasBot = Boolean(currentSettings.botChannelId && guild.channels.cache.has(currentSettings.botChannelId));
    const hasRules = Boolean(currentSettings.rulesChannelId && guild.channels.cache.has(currentSettings.rulesChannelId));
    const hasAnnounce = Boolean(currentSettings.announcementChannelId && guild.channels.cache.has(currentSettings.announcementChannelId));
    const hasWelcome = Boolean(currentSettings.welcomeChannelId && guild.channels.cache.has(currentSettings.welcomeChannelId));
    const hasPlayMusic = Boolean(currentSettings.musicChannelId && guild.channels.cache.has(currentSettings.musicChannelId));

    const allChannelsPresent = hasBot && hasRules && hasAnnounce && hasWelcome && hasPlayMusic;

    /*
    |--------------------------------------------------------------------------
    | 1. PERLINDUNGAN ONE-TIME SETUP
    |--------------------------------------------------------------------------
    | Jika sudah lengkap semua dan tidak dipaksa force, tampilkan status terkunci
    */
    if (currentSettings.autoSetupCompleted && allChannelsPresent && !force) {
        return new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('🔒 Auto-Setup Sudah Aktif & Lengkap (One-Time Execution)')
            .setDescription([
                `Server **${guild.name}** sudah berhasil disesuaikan dengan seluruh text channel & role Astral Cat.`,
                '',
                '### 📌 Konfigurasi Aktif Saat Ini:',
                `• 🤖 **Channel Bot:** <#${currentSettings.botChannelId}>`,
                `• 📜 **Channel Rules:** <#${currentSettings.rulesChannelId}>`,
                `• 📢 **Channel Pengumuman:** <#${currentSettings.announcementChannelId}>`,
                `• 👋 **Channel Sambutan:** <#${currentSettings.welcomeChannelId}>`,
                `• 🎵 **Channel Play Music:** <#${currentSettings.musicChannelId}>`,
                `• 🚻 **Role Men (Sidebar):** ${currentSettings.roleMenId ? `<@&${currentSettings.roleMenId}>` : '*Belum terpasang*'}`,
                `• 🚻 **Role Women (Sidebar):** ${currentSettings.roleWomenId ? `<@&${currentSettings.roleWomenId}>` : '*Belum terpasang*'}`,
                `• 📩 **Pemilihan Role:** Berbasis DM otomatis & \`!claim-role\``,
                '',
                '✨ *Semua channel sudah siap digunakan tanpa duplikasi.*',
                '',
                '💡 **Ingin Memperbarui Paksa?**',
                'Ketik `!setup-all force` atau `/auto-setup force:True`'
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
    | A. ROLE GENDER (Men & Women) - TAMPIL DI SIDEBAR KANAN (HOIST: TRUE)
    |--------------------------------------------------------------------------
    */
    let menRole = findExistingRole(guild, ['men', 'man', 'pria', 'lakilaki', 'laki', 'cowok']);
    if (!menRole) {
        menRole = await guild.roles.create({
            name: 'Men ♂️',
            color: 0x3498DB,
            hoist: true,
            reason: 'Astral Cat: Auto-Setup Role Gender (Tampil di sidebar kanan)'
        });
        logSteps.push(`✅ Dibuat role baru: **${menRole.name}** *(Sidebar status aktif)*`);
    } else {
        if (!menRole.hoist) {
            await menRole.edit({ hoist: true }).catch(() => {});
            logSteps.push(`ℹ️ Memperbarui role **${menRole.name}** agar tampil di sidebar kanan.`);
        } else {
            logSteps.push(`ℹ️ Menggunakan role yang ada: **${menRole.name}**`);
        }
    }

    let womenRole = findExistingRole(guild, ['women', 'woman', 'wanita', 'perempuan', 'cewek']);
    if (!womenRole) {
        womenRole = await guild.roles.create({
            name: 'Women ♀️',
            color: 0xE91E63,
            hoist: true,
            reason: 'Astral Cat: Auto-Setup Role Gender (Tampil di sidebar kanan)'
        });
        logSteps.push(`✅ Dibuat role baru: **${womenRole.name}** *(Sidebar status aktif)*`);
    } else {
        if (!womenRole.hoist) {
            await womenRole.edit({ hoist: true }).catch(() => {});
            logSteps.push(`ℹ️ Memperbarui role **${womenRole.name}** agar tampil di sidebar kanan.`);
        } else {
            logSteps.push(`ℹ️ Menggunakan role yang ada: **${womenRole.name}**`);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | B. TEXT CHANNEL: 🤖・bot (Bot Commands Center)
    |--------------------------------------------------------------------------
    */
    let botChannel = findExistingChannel(guild, [
        'bot',
        'botcommands',
        'botcmd',
        'commands',
        'cmd'
    ], ChannelType.GuildText);

    if (!botChannel) {
        botChannel = await guild.channels.create({
            name: '🤖・bot',
            type: ChannelType.GuildText,
            topic: 'Saluran khusus perintah & interaksi bot Astral Cat',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: botMember.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.AttachFiles
                    ]
                }
            ]
        });

        const botGuideEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Astral Cat Bot Center')
            .setDescription([
                'Selamat datang di saluran interaksi bot Astral Cat!',
                '',
                'Gunakan saluran ini untuk mengeksekusi perintah bot agar channel obrolan utama tetap bersih dan rapi.',
                '',
                '### 📌 Perintah Populer:',
                '• `!help` atau `/help` — Melihat daftar seluruh perintah',
                '• `!ping` atau `/ping` — Memeriksa status & latensi bot',
                '• `!setup-all` — Menjalankan setup otomatis server',
                '• `!announce` — Mengirim pengumuman resmi server',
                '• `!play <judul lagu>` — Memutar musik di voice channel'
            ].join('\n'))
            .setFooter({ text: `${guild.name} • Bot Center`, iconURL: guild.iconURL() || undefined });

        await botChannel.send({ embeds: [botGuideEmbed] });
        logSteps.push(`✅ Dibuat channel baru: <#${botChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel bot yang ada: <#${botChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | C. TEXT CHANNEL: 📜・rules (Server Rules)
    |--------------------------------------------------------------------------
    */
    let rulesChannel = findExistingChannel(guild, [
        'rules',
        'rule',
        'peraturan',
        'tatatertib',
        'terms'
    ], ChannelType.GuildText);

    if (!rulesChannel) {
        rulesChannel = await guild.channels.create({
            name: '📜・rules',
            type: ChannelType.GuildText,
            topic: 'Peraturan dan tata tertib resmi komunitas server',
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

        const rulesEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('📜 Peraturan Resmi Server')
            .setDescription([
                'Selamat datang di server! Demi kenyamanan bersama, setiap anggota diwajibkan mematuhi aturan berikut:',
                '',
                '1. **Saling Menghargai & Sopan Santun:** Dilarang melakukan ujaran kebencian, diskriminasi, perundungan (*bullying*), atau pelecehan dalam bentuk apa pun.',
                '2. **Dilarang Spam & Iklan Liar:** Hindari pengiriman pesan beruntun (*flooding*), spam mention, membagikan link server lain, atau promosi komersial tanpa izin pengelola.',
                '3. **Gunakan Channel Sesuai Fungsinya:**',
                `   • Gunakan channel <#${botChannel.id}> untuk perintah bot.`,
                '   • Obrolan santai dilakukan pada channel umum yang tersedia.',
                '4. **Keamanan & Privasi:** Dilarang keras menyebarkan identitas atau data pribadi (*doxxing*) dan mengirim tautan mencurigakan (*phishing/malware*).',
                '5. **Patuhi Ketentuan Discord:** Seluruh pedoman Discord Community Guidelines & ToS berlaku penuh di server ini.',
                '',
                '✨ *Pelanggaran dapat berakibat peringatan, mute, kick, hingga banned permanen.*'
            ].join('\n'))
            .setFooter({ text: `${guild.name} • Rules & Guidelines`, iconURL: guild.iconURL() || undefined })
            .setTimestamp();

        await rulesChannel.send({ embeds: [rulesEmbed] });
        logSteps.push(`✅ Dibuat channel baru: <#${rulesChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel rules yang ada: <#${rulesChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | D. TEXT CHANNEL: 📢・announcement (Server Announcements)
    |--------------------------------------------------------------------------
    */
    let announceChannel = findExistingChannel(guild, [
        'announcement',
        'announcements',
        'pengumuman',
        'info',
        'news',
        'broadcast'
    ], ChannelType.GuildText);

    if (!announceChannel) {
        announceChannel = await guild.channels.create({
            name: '📢・announcement',
            type: ChannelType.GuildText,
            topic: 'Pengumuman dan informasi resmi server dari pengelola',
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

        const announceEmbed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('📢 Pengumuman Resmi Server')
            .setDescription([
                'Channel ini dipergunakan oleh pihak admin & staf server untuk mengumumkan kabar, pembaruan penting, dan kegiatan resmi komunitas.',
                '',
                '🔔 *Aktifkan notifikasi pada channel ini agar kamu selalu mendapatkan informasi terkini!*'
            ].join('\n'))
            .setFooter({ text: `${guild.name} • Official Announcement`, iconURL: guild.iconURL() || undefined })
            .setTimestamp();

        await announceChannel.send({ embeds: [announceEmbed] });
        logSteps.push(`✅ Dibuat channel baru: <#${announceChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel pengumuman yang ada: <#${announceChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | E. TEXT CHANNEL: 🎵・play-music (Music Player Text Channel)
    |--------------------------------------------------------------------------
    */
    let playMusicChannel = findExistingChannel(guild, [
        'playmusic',
        'play-music',
        'music',
        'musik',
        'botmusic',
        'pemutarmusik'
    ], ChannelType.GuildText);

    if (!playMusicChannel) {
        playMusicChannel = await guild.channels.create({
            name: '🎵・play-music',
            type: ChannelType.GuildText,
            topic: 'Ketik !play <judul lagu> atau /play untuk memutar musik di voice channel',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: botMember.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.AttachFiles
                    ]
                }
            ]
        });

        const musicGuideEmbed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🎵 Astral Cat Music Player')
            .setDescription([
                'Gunakan channel ini untuk mencari dan memutar musik di voice channel mana pun!',
                '',
                '### 🎧 Panduan Memutar Musik:',
                '1. Masuk ke salah satu voice channel di server.',
                '2. Ketik perintah musik di bawah ini:',
                '',
                '### 📜 Daftar Perintah Musik:',
                '• `!play <judul / URL>` atau `/play` — Memutar lagu dari YouTube atau Spotify',
                '• `!pause` atau `/pause` — Menjeda musik yang sedang berjalan',
                '• `!resume` atau `/resume` — Melanjutkan pemutaran musik',
                '• `!skip` atau `/skip` — Melewati lagu ke antrean selanjutnya',
                '• `!queue` atau `/queue` — Menampilkan antrean daftar putar',
                '• `!nowplaying` atau `/nowplaying` — Menampilkan informasi lagu saat ini',
                '• `!stop` atau `/stop` — Menghentikan pemutaran musik & membersihkan antrean',
                '',
                '🔊 *Audio jernih & bebas jeda dipersembahkan oleh Astral Cat!*'
            ].join('\n'))
            .setFooter({ text: `${guild.name} • Music Player`, iconURL: guild.iconURL() || undefined });

        await playMusicChannel.send({ embeds: [musicGuideEmbed] });
        logSteps.push(`✅ Dibuat channel baru: <#${playMusicChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel play-music yang ada: <#${playMusicChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | F. BERSIHKAN TEXT CHANNEL PILIH ROLE (SEKARANG BERBASIS DM OTOMATIS)
    |--------------------------------------------------------------------------
    */
    const legacyRoleChannel = findExistingChannel(guild, [
        'pilihrole',
        'claimrole',
        'ambilrole',
        'gender'
    ], ChannelType.GuildText);

    if (legacyRoleChannel) {
        await legacyRoleChannel.delete('Astral Cat: Menghilangkan text channel pilih role (beralih ke DM otomatis)').catch(() => {});
        logSteps.push(`🗑️ Menghapus text channel pilih role: #${legacyRoleChannel.name} (beralih ke sistem DM)`);
    }

    /*
    |--------------------------------------------------------------------------
    | G. TEXT CHANNEL: 👋・selamat-datang (Welcome Channel)
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
            topic: 'Saluran sambutan resmi anggota baru oleh Astral Cat',
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

        const welcomeGuideEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`🎉 Selamat Datang di ${guild.name}!`)
            .setDescription([
                'Halo dan selamat bergabung di komunitas kami!',
                '',
                '📌 **Langkah Awal Anggota Baru:**',
                `1. 📜 Silakan baca tata tertib di <#${rulesChannel.id}>`,
                '2. 🚻 Ambil role gender kamu melalui pesan DM otomatis dari bot (atau ketik `!claim-role`)',
                `3. 🎵 Putar musik favoritmu di <#${playMusicChannel.id}>`,
                `4. 🤖 Gunakan bot commands di <#${botChannel.id}>`,
                '',
                'Selamat menikmati waktu dan selamat berteman! 🚀'
            ].join('\n'))
            .setFooter({ text: `${guild.name} • Welcomer`, iconURL: guild.iconURL() || undefined })
            .setTimestamp();

        await welcomeChannel.send({ embeds: [welcomeGuideEmbed] });
        logSteps.push(`✅ Dibuat channel baru: <#${welcomeChannel.id}>`);
    } else {
        logSteps.push(`ℹ️ Menggunakan channel sambutan yang ada: <#${welcomeChannel.id}>`);
    }

    /*
    |--------------------------------------------------------------------------
    | H. SIMPAN SEMUA KONFIGURASI KE GUILD SETTINGS
    |--------------------------------------------------------------------------
    */
    updateGuildSettings(guild.id, {
        botChannelId: botChannel.id,
        rulesChannelId: rulesChannel.id,
        announcementChannelId: announceChannel.id,
        welcomeChannelId: welcomeChannel.id,
        musicChannelId: playMusicChannel.id,
        roleMenId: menRole.id,
        roleWomenId: womenRole.id,
        autoSetupCompleted: true,
        autoSetupDate: new Date().toISOString()
    });

    const executorTag = executorMember?.user?.tag || 'Astral Cat (Auto Onboarding)';

    const reportEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✨ Pengaturan Server Astral Cat Selesai!')
        .setDescription([
            `Semua fitur dan text channel Astral Cat kini telah disesuaikan untuk **${guild.name}**.`,
            '',
            '### 📋 Hasil Pengaturan Server:',
            `• 🤖 **Channel Bot:** <#${botChannel.id}>`,
            `• 📜 **Channel Rules:** <#${rulesChannel.id}> *(Aturan resmi aktif)*`,
            `• 📢 **Channel Announcement:** <#${announceChannel.id}> *(Siap digunakan)*`,
            `• 🎵 **Channel Play Music:** <#${playMusicChannel.id}> *(Voice Lounge dinonaktifkan)*`,
            `• 👋 **Channel Sambutan:** <#${welcomeChannel.id}> *(Banner kanvas otomatis)*`,
            `• 👥 **Role Sidebar:** ${menRole} & ${womenRole} *(Tampil terpisah di kanan)*`,
            '• 📩 **Auto DM Onboarding:** Otomatis mengirim DM pemilihan role atau ketik `!claim-role`',
            '',
            '### 💡 Langkah Terakhir Admin (Penting!):',
            'Buka **Server Settings > Roles**, lalu pastikan role **"Astral Cat" berada di posisi atas** melebihi role *Men* & *Women* agar bot dapat memberikan role secara lancar.',
            '',
            'Semua perintah kini siap dinikmati langsung!'
        ].join('\n'))
        .setThumbnail(guild.iconURL({ dynamic: true }) || undefined)
        .setFooter({ text: `Auto-Setup selesai • Dijalankan oleh ${executorTag}` })
        .setTimestamp();

    return reportEmbed;
}

/**
 * Jalankan setup otomatis saat bot pertama kali masuk ke server baru
 * @param {import('discord.js').Guild} guild
 */
async function autoSetupOnGuildJoin(guild) {
    try {
        const botMember = guild.members.me;

        // 1. Cari atau buat channel bot terlebih dahulu
        let botChannel = findExistingChannel(guild, [
            'bot',
            'botcommands',
            'botcmd',
            'commands',
            'cmd'
        ], ChannelType.GuildText);

        if (!botChannel) {
            botChannel = await guild.channels.create({
                name: '🤖・bot',
                type: ChannelType.GuildText,
                topic: 'Saluran khusus perintah & interaksi bot Astral Cat',
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        id: botMember.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.EmbedLinks,
                            PermissionFlagsBits.AttachFiles
                        ]
                    }
                ]
            });
        }

        // 2. Kirim pesan notifikasi awal di channel bot
        const progressMsg = await botChannel.send({
            content: `⚡ **Halo ${guild.name}!** Astral Cat baru saja masuk ke server. Sedang menjalankan \`!setup-all\` secara otomatis...`
        });

        // 3. Jalankan executeAutoSetup
        const resultEmbed = await executeAutoSetup(guild, botMember, true);

        // 4. Perbarui pesan dengan embed laporan
        await progressMsg.edit({
            content: `🎉 **Auto-Setup Selesai!** Selamat menggunakan Astral Cat di **${guild.name}**.`,
            embeds: [resultEmbed]
        });

        console.log(`🎉 [Auto-Join Setup] Berhasil mengonfigurasi server: ${guild.name}`);
    } catch (error) {
        console.error(`❌ [Auto-Join Setup] Gagal mengonfigurasi ${guild.name}:`, error);
    }
}

/**
 * Handle command !auto-setup atau !setup-all
 */
async function handleAutoSetupCommand(message, args = []) {
    if (
        !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return message.reply('❌ Kamu memerlukan izin **Manage Server** atau **Administrator** untuk menjalankan setup.');
    }

    const force = args[0]?.toLowerCase() === 'force';
    const waitMsg = await message.reply('⚡ Sedang memeriksa dan menyesuaikan seluruh channel & role server...');

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
    autoSetupOnGuildJoin,
    handleAutoSetupCommand
};
