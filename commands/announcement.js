const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../utils/guildSettings');

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

    const settings = getGuildSettings(message.guild.id);
    let targetChannel = message.mentions.channels.first();

    if (!targetChannel) {
        if (settings.announcementChannelId) {
            targetChannel = message.guild.channels.cache.get(settings.announcementChannelId);
        }
    }

    if (!targetChannel && process.env.ANNOUNCEMENT_CHANNEL_ID) {
        targetChannel = message.guild.channels.cache.get(process.env.ANNOUNCEMENT_CHANNEL_ID.trim());
    }

    if (!targetChannel) {
        const found = message.guild.channels.cache.find(c =>
            c.isTextBased() && ['pengumuman', 'announcement', 'announcements'].some(name => c.name.toLowerCase().includes(name))
        );
        if (found) targetChannel = found;
    }

    if (!targetChannel) {
        targetChannel = message.channel;
    }

    if (!targetChannel.isTextBased()) {
        return message.reply(
            '❌ Channel pengumuman harus berupa channel teks!'
        );
    }

    // Simpan ke guild settings jika target di-mention eksplisit
    if (message.mentions.channels.first()) {
        updateGuildSettings(message.guild.id, { announcementChannelId: targetChannel.id });
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
            `${ANNOUNCE_BUTTON_ID}:stream:${isAnnounceAll ? 'all' : 'normal'}:${targetChannel.id}`
        )
        .setLabel('Stream')
        .setEmoji('🎥')
        .setStyle(ButtonStyle.Primary);

    const maintenanceButton = new ButtonBuilder()
        .setCustomId(
            `${ANNOUNCE_BUTTON_ID}:maintenance:${isAnnounceAll ? 'all' : 'normal'}:${targetChannel.id}`
        )
        .setLabel('Maintenance')
        .setEmoji('🔧')
        .setStyle(ButtonStyle.Danger);

    const generalButton = new ButtonBuilder()
        .setCustomId(
            `${ANNOUNCE_BUTTON_ID}:general:${isAnnounceAll ? 'all' : 'normal'}:${targetChannel.id}`
        )
        .setLabel('General')
        .setEmoji('📢')
        .setStyle(ButtonStyle.Secondary);

    const eventButton = new ButtonBuilder()
        .setCustomId(
            `${ANNOUNCE_BUTTON_ID}:event:${isAnnounceAll ? 'all' : 'normal'}:${targetChannel.id}`
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