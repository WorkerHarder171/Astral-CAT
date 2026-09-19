const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

async function handleAnnounce(message, command, args) {
    if (
        !message.member.permissions.has(PermissionFlagsBits.ManageMessages) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return message.reply('❌ Anda membutuhkan izin **Manage Messages** atau **Administrator**!');
    }

    const targetChannel = message.mentions.channels.first();
    if (!targetChannel) {
        return message.reply(
            '❌ Format perintah salah!\n' +
            '• `!announce #pengumuman Pesan`\n' +
            '• `!announce #pengumuman Judul | Pesan`\n' +
            '• `!announce-all #pengumuman Judul | Pesan`'
        );
    }

    if (!targetChannel.isTextBased()) {
        return message.reply('❌ Channel target harus berupa channel teks!');
    }

    const contentAfterMention = args.slice(1).join(' ').trim();
    if (!contentAfterMention) {
        return message.reply('❌ Isi pesan pengumuman tidak boleh kosong!');
    }

    let title = '📢 PENGUMUMAN RESMI';
    let description = contentAfterMention;

    if (contentAfterMention.includes('|')) {
        const parts = contentAfterMention.split('|');
        title = '📢 ' + parts[0].trim();
        description = parts.slice(1).join('|').trim();
    }

    const announceEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
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
        if (command === 'announce-all') sendOptions.content = '@everyone';

        await targetChannel.send(sendOptions);
        await message.delete().catch(() => {});

        const confirmMsg = await message.channel.send(`✅ Pengumuman berhasil dikirim ke <#${targetChannel.id}>!`);
        setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
    } catch (err) {
        console.error('Error pengumuman:', err);
        return message.reply(`❌ Gagal mengirim pengumuman: ${err.message}`);
    }
}

module.exports = { handleAnnounce };