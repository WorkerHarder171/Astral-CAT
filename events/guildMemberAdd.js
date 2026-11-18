const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const welcomeModule = require('../welcome');
const { getGuildSettings } = require('../utils/guildSettings');

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

        // Auto-detect nama channel umum sambutan
        if (!welcomeChannel) {
            const channelNames = ['welcome', 'selamat-datang', 'sambutan', 'general', 'chat', 'utama', 'lounge'];
            welcomeChannel = member.guild.channels.cache.find(c =>
                c.isTextBased() && channelNames.some(name => c.name.toLowerCase().includes(name))
            );
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
                await welcomeChannel.send({
                    content: `🎉 Halo <@${member.user.id}>, selamat datang di **${member.guild.name}**!`,
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
        .setTitle('👋 Selamat Datang!')
        .setDescription([
            `Halo ${member.user.username}!`,
            '',
            `Selamat datang di **${member.guild.name}**.`,
            '',
            'Sebelum melanjutkan, silakan pilih role gender kamu:',
            '',
            '♂️ **Man**',
            '♀️ **Woman**',
            '',
            'Klik salah satu tombol di bawah.'
        ].join('\n'))
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
            text: member.guild.name,
            iconURL: member.guild.iconURL() || undefined
        })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`claim_gender_man:${member.guild.id}`)
            .setLabel('Man')
            .setEmoji('♂️')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`claim_gender_woman:${member.guild.id}`)
            .setLabel('Woman')
            .setEmoji('♀️')
            .setStyle(ButtonStyle.Success)
    );

    try {
        await member.send({
            embeds: [embed],
            components: [row]
        });

        console.log(
            `✅ Gender selection dikirim ke ${member.user.tag}`
        );
    } catch (error) {
        if (error.code === 50007) {
            console.warn(
                `⚠️ Tidak dapat mengirim DM ke ${member.user.tag}. DM mungkin ditutup.`
            );
        } else {
            console.error(
                `❌ Gagal mengirim DM ke ${member.user.tag}:`,
                error
            );
        }
    }
};