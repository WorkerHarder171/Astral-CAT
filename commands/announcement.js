const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const ANNOUNCE_BUTTON_ID = 'announcement_create';

async function handleAnnounce(message, command) {
    if (
        !message.member.permissions.has(
            PermissionFlagsBits.ManageMessages
        ) &&
        !message.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return message.reply(
            '❌ Anda membutuhkan izin **Manage Messages** atau **Administrator**!'
        );
    }

    const announcementChannelId =
        process.env.ANNOUNCEMENT_CHANNEL_ID?.trim();

    if (!announcementChannelId) {
        return message.reply(
            '❌ `ANNOUNCEMENT_CHANNEL_ID` belum dikonfigurasi di `.env`.'
        );
    }

    const targetChannel =
        message.guild.channels.cache.get(
            announcementChannelId
        );

    if (!targetChannel) {
        return message.reply(
            '❌ Channel pengumuman tidak ditemukan.\n' +
            'Periksa kembali `ANNOUNCEMENT_CHANNEL_ID` di `.env`.'
        );
    }

    if (!targetChannel.isTextBased()) {
        return message.reply(
            '❌ Channel pengumuman harus berupa channel teks!'
        );
    }

    const isAnnounceAll = command === 'announce-all';

    const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('📢 BUAT PENGUMUMAN')
        .setDescription(
            '# Pilih Template\n\n' +
            'Pilih template yang ingin digunakan.\n\n' +
            'Setelah memilih template, kamu masih dapat mengubah seluruh isi pengumuman sebelum dikirim.'
        )
        .addFields({
            name: '📌 Channel Tujuan',
            value: `<#${targetChannel.id}>`
        })
        .setFooter({
            text: isAnnounceAll
                ? 'Mode: @everyone'
                : 'Mode: Pengumuman'
        });

    const streamButton = new ButtonBuilder()
        .setCustomId(
            `${ANNOUNCE_BUTTON_ID}:stream:${isAnnounceAll ? 'all' : 'normal'}`
        )
        .setLabel('Stream')
        .setEmoji('🎥')
        .setStyle(ButtonStyle.Primary);

    const maintenanceButton = new ButtonBuilder()
        .setCustomId(
            `${ANNOUNCE_BUTTON_ID}:maintenance:${isAnnounceAll ? 'all' : 'normal'}`
        )
        .setLabel('Maintenance')
        .setEmoji('🔧')
        .setStyle(ButtonStyle.Danger);

    const generalButton = new ButtonBuilder()
        .setCustomId(
            `${ANNOUNCE_BUTTON_ID}:general:${isAnnounceAll ? 'all' : 'normal'}`
        )
        .setLabel('General')
        .setEmoji('📢')
        .setStyle(ButtonStyle.Secondary);

    const eventButton = new ButtonBuilder()
        .setCustomId(
            `${ANNOUNCE_BUTTON_ID}:event:${isAnnounceAll ? 'all' : 'normal'}`
        )
        .setLabel('Event')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder()
        .addComponents(
            streamButton,
            maintenanceButton,
            generalButton,
            eventButton
        );

    return message.reply({
        embeds: [embed],
        components: [row]
    });
}

module.exports = {
    handleAnnounce,
    ANNOUNCE_BUTTON_ID
};