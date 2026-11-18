const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const welcomeModule = require('../welcome');
const { getGuildSettings, updateGuildSettings } = require('../utils/guildSettings');
const { findExistingChannel } = require('../commands/auto-setup');

module.exports = async (member) => {
    if (member.user.bot) {
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | 1. WELCOME CARD CANVAS DI SERVER CHANNEL (MULTI-SERVER READY)
    |--------------------------------------------------------------------------
    */
    try {
        const settings = getGuildSettings(member.guild.id);
        let welcomeChannel = null;

        // Cari berdasarkan konfigurasi guild
        if (settings.welcomeChannelId) {
            welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannelId);
        }

        // Fallback ke .env jika ID ada di server ini
        if (!welcomeChannel && process.env.WELCOME_CHANNEL_ID) {
            welcomeChannel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID.trim());
        }

        // Auto-detect nama channel umum sambutan (Smart Reuse)
        if (!welcomeChannel) {
            welcomeChannel = findExistingChannel(member.guild, [
                'welcome',
                'selamatdatang',
                'sambutan',
                'welcomer',
                'memberbaru',
                'general',
                'chat',
                'utama',
                'lounge'
            ]);

            if (welcomeChannel) {
                updateGuildSettings(member.guild.id, { welcomeChannelId: welcomeChannel.id });
            }
        }

        // Fallback terakhir: systemChannel server
        if (!welcomeChannel && member.guild.systemChannel) {
            welcomeChannel = member.guild.systemChannel;
        }

        // Jika channel ditemukan dan bot punya izin mengirim pesan
        if (welcomeChannel && welcomeChannel.isTextBased()) {
            const botPermissions = welcomeChannel.permissionsFor(member.guild.members.me);
            if (!botPermissions || botPermissions.has(['SendMessages', 'AttachFiles'])) {
                const card = await welcomeModule.generateWelcomeCard(member);
                const roleMention = settings.roleChannelId ? ` Jangan lupa ambil role kamu di <#${settings.roleChannelId}>!` : '';
                await welcomeChannel.send({
                    content: `🎉 Halo <@${member.user.id}>, selamat datang di **${member.guild.name}**!${roleMention}`,
                    files: [card]
                });
                console.log(`✅ Welcome card berhasil dikirim ke #${welcomeChannel.name} di ${member.guild.name}`);
            }
        }
    } catch (err) {
        console.error(`❌ Gagal mengirim welcome card di ${member.guild.name}:`, err.message);
    }

    /*
    |--------------------------------------------------------------------------
    | 2. GENDER SELECTION ONBOARDING DM
    |--------------------------------------------------------------------------
    */
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`👋 Selamat Datang di ${member.guild.name}!`)
        .setDescription([
            `Halo **${member.user.username}**! Senang kamu bergabung bersama kami.`,
            '',
            'Untuk melengkapi profil kamu dan menampilkannya di daftar anggota (sidebar kanan), silakan pilih role gender kamu dengan menekan tombol di bawah:',
            '',
            '♂️ **Men** — Role untuk pria/laki-laki',
            '♀️ **Women** — Role untuk wanita/perempuan',
            '',
            '✨ *Pilihan ini langsung aktif di server!*'
        ].join('\n'))
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
            text: `${member.guild.name} • Onboarding System`,
            iconURL: member.guild.iconURL() || undefined
        })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`claim_gender_man:${member.guild.id}`)
            .setLabel('Men ♂️')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`claim_gender_woman:${member.guild.id}`)
            .setLabel('Women ♀️')
            .setStyle(ButtonStyle.Danger)
    );

    let dmSent = false;
    try {
        await member.send({
            embeds: [embed],
            components: [row]
        });
        dmSent = true;
        console.log(`✅ DM role onboarding berhasil dikirim ke @${member.user.tag}`);
    } catch (error) {
        if (error.code === 50007) {
            console.warn(`⚠️ DM tertutup untuk @${member.user.tag}.`);
        } else {
            console.error(`❌ Gagal mengirim DM ke @${member.user.tag}:`, error.message);
        }
    }
};