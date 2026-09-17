const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    Events,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
require('dotenv').config();

const music = require('./music.js');

const welcome = require('./welcome.js');

// ID Channel Welcome (bisa diatur via .env atau perintah !setup-welcome)
let welcomeChannelId = process.env.WELCOME_CHANNEL_ID || '';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const play = require('play-dl');
require('dotenv').config();

client.once('ready', async () => {
    console.log(`Bot logged in as ${client.user.tag}`);

    try {
        // Memuat file token otorisasi yang baru saja dibuat
        await play.setToken({
            user_data: true
        });
        console.log('✅ Spotify Token terpasang & siap digunakan!');
    } catch (err) {
        console.error('❌ Gagal memuat Spotify token:', err);
    }
});

// === KONFIGURASI ROLE ID ===
// ID dapat disetting langsung di file .env atau ganti nilai default di bawah ini
const ROLE_MEN_ID = process.env.ROLE_MEN_ID || 'MASUKKAN_ID_ROLE_MEN_DISINI';
const ROLE_WOMEN_ID = process.env.ROLE_WOMEN_ID || 'MASUKKAN_ID_ROLE_WOMEN_DISINI';
const PREFIX = '!';

/**
 * Menghasilkan panel Embed dan Button dengan live counting member Men & Women
 */
async function createRolePanel(guild) {
    // Sinkronkan cache member server agar hitungan akurat
    await guild.members.fetch().catch(() => {});

    const menRole = guild.roles.cache.get(ROLE_MEN_ID);
    const womenRole = guild.roles.cache.get(ROLE_WOMEN_ID);

    const menCount = menRole ? menRole.members.size : 0;
    const womenCount = womenRole ? womenRole.members.size : 0;

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🚻 Claim Role Gender - Mura World Server')
        .setDescription(
            'Selamat datang di server **Mura World**!\n\n' +
            'Silakan klik salah satu tombol di bawah untuk mengambil role gender Anda.\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '📊 **Jumlah Pengguna Role Saat Ini:**\n' +
            `> 👨 **Men :** \`${menCount}\` Member\n` +
            `> 👩 **Women :** \`${womenCount}\` Member\n` +
            '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '💡 *Catatan: Setiap member hanya dapat memiliki satu role gender.*'
        )
        .setFooter({
            text: 'Mura World • Otomatis diperbarui secara real-time',
            iconURL: guild.iconURL() || undefined
        })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('role_men')
            .setLabel(`Men ♂️ (${menCount})`)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('role_women')
            .setLabel(`Women ♀️ (${womenCount})`)
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('report_role')
            .setLabel('Lapor Salah Role 📩')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

client.once(Events.ClientReady, () => {
    console.log(`========================================`);
    console.log(`🤖 Bot ${client.user.tag} online!`);
    console.log(`⚡ Siap menerima perintah dengan prefix: "${PREFIX}"`);
    console.log(`========================================`);
});

// ==========================================
// LISTENER: Message Commands (Prefix '!')
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ----------------------------------------------------
    // 1. COMMAND: !setup-role [#channel]
    // ----------------------------------------------------
    if (command === 'setup-role' || command === 'setup-gender') {
        // Cek apakah pengirim memiliki izin Administrator atau Manage Roles
        if (
            !message.member.permissions.has(PermissionFlagsBits.ManageRoles) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Anda membutuhkan izin **Manage Roles** atau **Administrator** untuk menjalankan perintah ini!');
        }

        // Tentukan channel target: jika mention channel ada maka gunakan itu, jika tidak gunakan channel saat ini
        const targetChannel = message.mentions.channels.first() || message.channel;

        if (!targetChannel.isTextBased()) {
            return message.reply('❌ Channel target harus berupa channel teks!');
        }

        try {
            const panel = await createRolePanel(message.guild);
            await targetChannel.send(panel);

            if (targetChannel.id !== message.channel.id) {
                await message.reply(`✅ Pesan claim role berhasil dikirim ke channel <#${targetChannel.id}>!`);
            } else {
                await message.delete().catch(() => {});
            }
        } catch (err) {
            console.error('Error setup role:', err);
            return message.reply(`❌ Gagal mengirim pesan ke channel: ${err.message}`);
        }
    }

    // ----------------------------------------------------
    // 2. COMMAND: !announce <#channel> [Judul |] <Pesan>
    // ----------------------------------------------------
    else if (
        command === 'announce' ||
        command === 'announcement' ||
        command === 'pengumuman' ||
        command === 'announce-all'
    ) {
        if (
            !message.member.permissions.has(PermissionFlagsBits.ManageMessages) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Anda membutuhkan izin **Manage Messages** atau **Administrator** untuk membuat pengumuman!');
        }

        const targetChannel = message.mentions.channels.first();
        if (!targetChannel) {
            return message.reply(
                '❌ Format perintah salah!\n\n' +
                '**Contoh Penggunaan:**\n' +
                '• `!announce #pengumuman Ada gathering offline minggu ini!`\n' +
                '• Format dengan Judul:\n' +
                '  `!announce #pengumuman Info Maintenance | Server akan offline pukul 22:00 WIB`\n' +
                '• Dengan tag @everyone:\n' +
                '  `!announce-all #pengumuman Judul | Pesan penting`'
            );
        }

        if (!targetChannel.isTextBased()) {
            return message.reply('❌ Channel target harus berupa channel teks!');
        }

        // Ambil pesan setelah mention channel
        const contentAfterMention = args.slice(1).join(' ').trim();
        if (!contentAfterMention) {
            return message.reply('❌ Isi pesan pengumuman tidak boleh kosong!');
        }

        let title = '📢 PENGUMUMAN RESMI';
        let description = contentAfterMention;

        // Mendukung pemisah judul dengan pipa '|'
        if (contentAfterMention.includes('|')) {
            const parts = contentAfterMention.split('|');
            title = '📢 ' + parts[0].trim();
            description = parts.slice(1).join('|').trim();
        }

        const announceEmbed = new EmbedBuilder()
            .setColor(0xFEE75C) // Warna Gold pengumuman
            .setTitle(title)
            .setDescription(description)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Pengumuman Resmi • ${message.guild.name}` })
            .setTimestamp();

        try {
            const sendOptions = { embeds: [announceEmbed] };
            if (command === 'announce-all') {
                sendOptions.content = '@everyone';
            }

            await targetChannel.send(sendOptions);
            await message.delete().catch(() => {});

            const confirmMsg = await message.channel.send(`✅ Pengumuman berhasil dikirim ke <#${targetChannel.id}>!`);
            setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
        } catch (err) {
            console.error('Error saat mengirim pengumuman:', err);
            return message.reply(`❌ Gagal mengirim pengumuman: ${err.message}`);
        }
    }

    // ----------------------------------------------------
    // 3. COMMAND: MUSIC PLAYER
    // ----------------------------------------------------
if (command === 'play' || command === 'p') {
    await music.handlePlaySpotify(message, args);
}
else if (command === 'skip' || command === 's') {
    music.handleSkipSpotify(message);
}
else if (command === 'pause') {
    music.handlePauseSpotify(message);
}
else if (command === 'resume') {
    music.handleResumeSpotify(message);
}
else if (command === 'stop' || command === 'dc' || command === 'leave') {
    music.handleStopSpotify(message);
}
else if (command === 'queue' || command === 'q') {
    music.handleQueueSpotify(message);
}
else if (command === 'np' || command === 'nowplaying') {
    music.handleNowPlaying(message);
}

    // ----------------------------------------------------
    // 4. COMMAND: !help & !ping
    // ----------------------------------------------------
    else if (command === 'help' || command === 'bantuan') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Panduan Perintah Astral CAT Bot')
            .setDescription('Gunakan awalan perintah `!` di awal setiap command:\n')
            .addFields(
                {
                    name: '🚻 Claim Role Gender',
                    value: '`!setup-role [#channel]` - Mengirim menu claim role Men & Women ke channel tujuan atau channel saat ini.'
                },
                {
                    name: '📢 Pengumuman (Admin)',
                    value: '`!announce <#channel> [Judul |] <Pesan>` - Mengirim embed pengumuman ke channel tertentu.\n' +
                           '`!announce-all <#channel> [Judul |] <Pesan>` - Mengirim pengumuman disertai tag `@everyone`.'
                },
                {
                    name: '🎵 Musik',
                    value: '`!play <judul / link>` - Memutar lagu di voice channel\n' +
                           '`!skip` - Melewati lagu saat ini\n' +
                           '`!pause` - Menjeda lagu yang sedang diputar\n' +
                           '`!resume` - Melanjutkan lagu yang dijeda\n' +
                           '`!stop` - Menghentikan musik dan bot keluar dari voice\n' +
                           '`!queue` - Menampilkan daftar antrean musik\n' +
                           '`!np` - Menampilkan info lagu yang sedang diputar'
                },
                {
                    name: '👋 Sambutan (Welcome)',
                    value: '`!test-welcome` - Menguji kartu sambutan bergambar di channel ini\n`!setup-welcome <#channel>` - Mengatur channel pesan sambutan member baru'
                },
                {
                    name: '⚙️ Umum',
                    value: '`!help` - Menampilkan panduan bantuan ini\n`!ping` atau `!cekping` - Mengecek latensi dan kondisi bot'
                }
            )
            .setFooter({ text: `Astral CAT System • ${message.guild.name}`, iconURL: message.guild.iconURL() || undefined })
            .setTimestamp();

        return message.channel.send({ embeds: [helpEmbed] });
    }
    else if (command === 'ping' || command === 'cekping' || command === 'latency') {
        const sent = await message.reply('🏓 Menghitung latensi...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        // Format waktu aktif bot (uptime)
        const totalSeconds = process.uptime();
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const uptimeStr = `${days > 0 ? `${days}h ` : ''}${hours > 0 ? `${hours}j ` : ''}${minutes}m ${seconds}s`;

        // Penggunaan memori RAM
        const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        // Status dan warna embed berdasarkan kecepatan ping
        let embedColor = 0x57F287; // Hijau
        let statusKoneksi = '🟢 Sangat Bagus';
        if (apiLatency > 250 || latency > 300) {
            embedColor = 0xED4245; // Merah
            statusKoneksi = '🔴 Mengalami Kelambatan (High Ping)';
        } else if (apiLatency > 150 || latency > 200) {
            embedColor = 0xFEE75C; // Kuning
            statusKoneksi = '🟡 Cukup Baik / Normal';
        }

        const pingEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('🏓 Pong! Hasil Pengecekan Ping & Status Bot')
            .setDescription(`Kondisi jaringan bot: **${statusKoneksi}**`)
            .addFields(
                { name: '📨 Latensi Pesan (Roundtrip)', value: `\`${latency} ms\``, inline: true },
                { name: '🌐 WebSocket API Discord', value: `\`${apiLatency} ms\``, inline: true },
                { name: '💾 Penggunaan RAM', value: `\`${memoryUsed} MB\``, inline: true },
                { name: '⏱️ Bot Uptime', value: `\`${uptimeStr}\``, inline: true },
                { name: '⚡ Node.js', value: `\`${process.version}\``, inline: true }
            )
            .setFooter({
                text: `Astral CAT System • Diminta oleh ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        return sent.edit({ content: null, embeds: [pingEmbed] });
    }

    // ----------------------------------------------------
    // 5. COMMAND: WELCOME (!test-welcome & !setup-welcome)
    // ----------------------------------------------------
    else if (command === 'test-welcome' || command === 'testwelcome') {
        const loadingMsg = await message.reply('🎨 Sedang merender kartu sambutan...');
        try {
            const card = await welcome.generateWelcomeCard(message.member);
            await message.channel.send({
                content: `🎉 Halo <@${message.author.id}>, selamat datang di **${message.guild.name}**! *(Mode Uji Coba)*`,
                files: [card]
            });
            await loadingMsg.delete().catch(() => {});
        } catch (err) {
            console.error('Error test welcome:', err);
            await loadingMsg.edit(`❌ Gagal membuat welcome card: ${err.message}`);
        }
    }
    else if (command === 'setup-welcome') {
        if (
            !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Anda membutuhkan izin **Manage Server** atau **Administrator** untuk mengatur channel sambutan!');
        }

        const targetChannel = message.mentions.channels.first();
        if (!targetChannel || !targetChannel.isTextBased()) {
            return message.reply('❌ Harap tag channel tujuan!\nContoh: `!setup-welcome #welcome`');
        }

        welcomeChannelId = targetChannel.id;
        return message.reply(`✅ Channel sambutan berhasil diatur ke <#${targetChannel.id}>! Setiap member baru akan disambut dengan kartu grafis di channel tersebut.`);
    }
});

// ==========================================
// LISTENER: Interaction (Button & Modal)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    // ----------------------------------------------------
    // 1. HANDLER KETIKA TOMBOL DIKLIK
    // ----------------------------------------------------
    if (interaction.isButton()) {
        const { customId, member, guild } = interaction;

        // Tombol Lapor Salah Role (Memunculkan Form Modal)
        if (customId === 'report_role') {
            const modal = new ModalBuilder()
                .setCustomId('modal_report_role')
                .setTitle('Laporan Salah Input Role');

            const reasonInput = new TextInputBuilder()
                .setCustomId('report_reason')
                .setLabel('Jelaskan masalah / role yang benar:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Contoh: Saya salah klik Men, seharusnya Women. Mohon bantuannya min.')
                .setMinLength(5)
                .setMaxLength(500)
                .setRequired(true);

            const modalRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(modalRow);

            return await interaction.showModal(modal);
        }

        if (customId !== 'role_men' && customId !== 'role_women') return;

        // Acknowledge interaction secepatnya agar tidak timeout (Unknown interaction 10062)
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let targetRoleId = '';
        let oppositeRoleId = '';
        let roleName = '';
        let oppositeRoleName = '';

        if (customId === 'role_men') {
            targetRoleId = ROLE_MEN_ID;
            oppositeRoleId = ROLE_WOMEN_ID;
            roleName = 'Men';
            oppositeRoleName = 'Women';
        } else if (customId === 'role_women') {
            targetRoleId = ROLE_WOMEN_ID;
            oppositeRoleId = ROLE_MEN_ID;
            roleName = 'Women';
            oppositeRoleName = 'Men';
        }

        // Validasi apakah admin sudah mengisi Role ID
        if (!targetRoleId || targetRoleId.startsWith('MASUKKAN_ID')) {
            return interaction.editReply({
                content: `⚠️ ID Role **${roleName}** belum dikonfigurasi oleh Admin di file .env atau index.js!`
            });
        }

        const targetRole = guild.roles.cache.get(targetRoleId);
        if (!targetRole) {
            return interaction.editReply({
                content: `⚠️ Role **${roleName}** dengan ID \`${targetRoleId}\` tidak ditemukan di server ini!`
            });
        }

        const botMember = guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply({
                content: '⚠️ Bot tidak memiliki izin `Manage Roles`. Mohon berikan izin tersebut pada role bot!'
            });
        }

        if (botMember.roles.highest.position <= targetRole.position) {
            return interaction.editReply({
                content: `⚠️ Posisi role bot berada di bawah atau sejajar dengan role **${roleName}**. Mohon pindahkan role bot ke atas role ${roleName} di Server Settings > Roles!`
            });
        }

        try {
            // 1. Jika member sudah memiliki role yang diklik
            if (member.roles.cache.has(targetRoleId)) {
                return interaction.editReply({
                    content: `⚠️ Anda sudah memiliki role **${targetRole.name}**!`
                });
            }

            // 2. Jika member sudah memiliki role gender lawannya
            if (member.roles.cache.has(oppositeRoleId)) {
                const oppositeRole = guild.roles.cache.get(oppositeRoleId);
                const opName = oppositeRole ? oppositeRole.name : oppositeRoleName;
                return interaction.editReply({
                    content: `⚠️ Anda sudah memiliki role **${opName}**! Setiap member hanya dapat memilih satu role gender.\n*(Gunakan tombol **Lapor Salah Role 📩** di bawah pesan jika ingin meminta bantuan Admin)*`
                });
            }

            // 3. Jika belum memiliki role -> Berikan role berhasil
            await member.roles.add(targetRole);

            // Perbarui pesan panel embed dengan counting terbaru
            const updatedPanel = await createRolePanel(guild);
            await interaction.message.edit(updatedPanel).catch(() => {});

            // Berikan keterangan bahwa pilihan role telah berhasil
            return interaction.editReply({
                content: `✅ Pilihan role berhasil! Anda sekarang memiliki role **${targetRole.name}**.`
            });
        } catch (err) {
            console.error('Error interaction role:', err);
            return interaction.editReply({
                content: `❌ Gagal memperbarui role: ${err.message}`
            });
        }
    }

    // ----------------------------------------------------
    // 2. HANDLER KETIKA MODAL LAPORAN DISUBMIT
    // ----------------------------------------------------
    if (interaction.isModalSubmit() && interaction.customId === 'modal_report_role') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reason = interaction.fields.getTextInputValue('report_reason');
        const guild = interaction.guild;
        const member = interaction.member;

        // Cari admin penerima DM (dari ADMIN_USER_ID di .env atau otomatis Owner Server)
        let adminUser = null;
        if (process.env.ADMIN_USER_ID && process.env.ADMIN_USER_ID.trim() !== '') {
            adminUser = await client.users.fetch(process.env.ADMIN_USER_ID.trim()).catch(() => null);
        }

        if (!adminUser && guild) {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) adminUser = owner.user;
        }

        if (!adminUser) {
            return interaction.editReply({
                content: '❌ Tidak dapat menemukan Admin atau Owner server untuk mengirimkan DM. Silakan hubungi Admin secara langsung.'
            });
        }

        // Cek role gender yang saat ini dimiliki user
        const hasMen = member.roles.cache.has(ROLE_MEN_ID);
        const hasWomen = member.roles.cache.has(ROLE_WOMEN_ID);
        let currentRoleStatus = 'Belum memilih role gender';
        if (hasMen) currentRoleStatus = 'Men ♂️';
        else if (hasWomen) currentRoleStatus = 'Women ♀️';

        const reportEmbed = new EmbedBuilder()
            .setColor(0xED4245) // Merah laporan
            .setTitle('🚨 Laporan Salah Input Role Gender')
            .setDescription(`Ada member yang melaporkan salah input role di server **${guild.name}**.`)
            .addFields(
                { name: '👤 Member Pelapor', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                { name: '🆔 User ID', value: `\`${member.id}\``, inline: true },
                { name: '🏷️ Role Saat Ini', value: currentRoleStatus, inline: true },
                { name: '📝 Pesan / Keterangan', value: `\`\`\`${reason}\`\`\`` },
                { name: '🌐 Server', value: `${guild.name}`, inline: true },
                { name: '📅 Waktu Laporan', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Sistem Laporan Otomatis Bot' })
            .setTimestamp();

        try {
            await adminUser.send({ embeds: [reportEmbed] });
            return interaction.editReply({
                content: `✅ Laporan Anda telah berhasil diteruskan ke DM Admin (**${adminUser.tag}**)! Mohon menunggu hingga Admin membantu memperbaiki role Anda.`
            });
        } catch (err) {
            console.error('Gagal mengirim DM ke Admin:', err);
            return interaction.editReply({
                content: `⚠️ Laporan gagal dikirim ke DM Admin (**${adminUser.tag}**) karena DM-nya tertutup. Silakan hubungi Admin secara langsung di server.`
            });
        }
    }
});

// ==========================================
// LISTENER: Member Baru Bergabung (Auto Welcome Card)
// ==========================================
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        let channel = null;

        // 1. Cek channel dari setting welcomeChannelId
        if (welcomeChannelId) {
            channel = member.guild.channels.cache.get(welcomeChannelId);
        }

        // 2. Cari channel bernama welcome / selamat-datang jika belum disetting
        if (!channel) {
            channel = member.guild.channels.cache.find(
                (ch) => ch.isTextBased() && (ch.name.includes('welcome') || ch.name.includes('selamat-datang'))
            );
        }

        // 3. Fallback ke systemChannel bawaan server
        if (!channel) {
            channel = member.guild.systemChannel;
        }

        if (!channel || !channel.isTextBased()) return;

        const card = await welcome.generateWelcomeCard(member);
        await channel.send({
            content: `🎉 Halo <@${member.id}>, selamat datang di server **${member.guild.name}**!`,
            files: [card]
        });
    } catch (err) {
        console.error('Error saat menyambut member baru:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
