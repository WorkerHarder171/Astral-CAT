const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const welcomeModule = require('../welcome');
const { getGuildSettings, updateGuildSettings } = require('../utils/guildSettings');
const { findExistingChannel } = require('../commands/auto-setup');

/**
 * Mengirimkan pesan interaktif pemilihan role ke DM seorang member
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
async function sendRoleDm(member) {
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

    try {
        await member.send({
            embeds: [embed],
            components: [row]
        });
        console.log(`✅ DM role onboarding berhasil dikirim ke @${member.user.tag}`);
        return { success: true };
    } catch (error) {
        if (error.code === 50007) {
            console.warn(`⚠️ DM tertutup untuk @${member.user.tag}.`);
            return { success: false, reason: 'DM_CLOSED' };
        } else {
            console.error(`❌ Gagal mengirim DM ke @${member.user.tag}:`, error.message);
            return { success: false, reason: error.message };
        }
    }
}

async function handleGuildMemberAdd(member) {
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
                await welcomeChannel.send({
                    content: `🎉 Halo <@${member.user.id}>, selamat datang di **${member.guild.name}**! Silakan periksa pesan langsung (DM) untuk memilih role kamu (atau ketik \`!claim-role\`).`,
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
    | 2. GENDER SELECTION ONBOARDING DM (ANTI-REDUNDANSI)
    |--------------------------------------------------------------------------
    */
    const dmedUserIds = new Set(settings.dmedUserIds || []);
    if (!dmedUserIds.has(member.user.id)) {
        await sendRoleDm(member);
        dmedUserIds.add(member.user.id);
        updateGuildSettings(member.guild.id, { dmedUserIds: Array.from(dmedUserIds) });
    }
}

module.exports = handleGuildMemberAdd;
module.exports.sendRoleDm = sendRoleDm;