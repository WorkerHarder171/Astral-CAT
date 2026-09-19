const { 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

async function createRolePanel(guild) {
    const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🚻 Pilihan Role Gender')
        .setDescription('Silakan pilih role gender Anda dengan menekan salah satu tombol di bawah ini.')
        .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_men').setLabel('Men ♂️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('role_women').setLabel('Women ♀️').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('report_role').setLabel('Lapor Salah Role 📩').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

async function handleSetupRole(message) {
    if (
        !message.member.permissions.has(PermissionFlagsBits.ManageRoles) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return message.reply('❌ Anda membutuhkan izin **Manage Roles** atau **Administrator**!');
    }

    const targetChannel = message.mentions.channels.first() || message.channel;
    if (!targetChannel.isTextBased()) {
        return message.reply('❌ Channel target harus berupa channel teks!');
    }

    try {
        const panel = await createRolePanel(message.guild);
        await targetChannel.send(panel);

        if (targetChannel.id !== message.channel.id) {
            await message.reply(`✅ Pesan claim role berhasil dikirim ke <#${targetChannel.id}>!`);
        } else {
            await message.delete().catch(() => {});
        }
    } catch (err) {
        console.error('Error setup role:', err);
        return message.reply(`❌ Gagal mengirim pesan: ${err.message}`);
    }
}

module.exports = { createRolePanel, handleSetupRole };