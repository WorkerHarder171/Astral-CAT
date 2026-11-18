const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

const announcementTemplates =
    require('../templates/announcementTemplate');

async function handleInteraction(client, interaction) {
    try {
        if (
            interaction.isButton() &&
            interaction.customId.startsWith(
                'announcement_create:'
            )
        ) {
            const parts =
                interaction.customId.split(':');

            const templateName = parts[1];
            const mode = parts[2];
            const channelId = parts[3] || '';

            const template =
                announcementTemplates[templateName];

            if (!template) {
                return interaction.reply({
                    content:
                        '❌ Template pengumuman tidak ditemukan.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(
                    `announcement_modal:${templateName}:${mode}:${channelId}`
                )
                .setTitle(
                    `${template.emoji} ${template.label}`
                );

            const titleInput = new TextInputBuilder()
                .setCustomId('announcement_title')
                .setLabel('Judul Pengumuman')
                .setPlaceholder(
                    'Contoh: Maintenance Server'
                )
                .setValue(template.title)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(256);

            const messageInput = new TextInputBuilder()
                .setCustomId('announcement_message')
                .setLabel('Pesan Pengumuman')
                .setPlaceholder(
                    'Tuliskan isi pengumuman di sini...'
                )
                .setValue(template.message)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(4000);

            const dateInput = new TextInputBuilder()
                .setCustomId('announcement_date')
                .setLabel('Hari & Tanggal')
                .setPlaceholder(
                    'Contoh: Senin, 21 September 2026'
                )
                .setValue(template.date || '')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const timeInput = new TextInputBuilder()
                .setCustomId('announcement_time')
                .setLabel('Jam')
                .setPlaceholder(
                    'Contoh: 22:00 WIB'
                )
                .setValue(template.time || '')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const closureInput = new TextInputBuilder()
                .setCustomId('announcement_closure')
                .setLabel('Penutup')
                .setPlaceholder(
                    'Contoh: Terima kasih atas perhatian dan pengertiannya.'
                )
                .setValue(template.closure || '')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(1000);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(titleInput),

                new ActionRowBuilder()
                    .addComponents(messageInput),

                new ActionRowBuilder()
                    .addComponents(dateInput),

                new ActionRowBuilder()
                    .addComponents(timeInput),

                new ActionRowBuilder()
                    .addComponents(closureInput)
            );

            return interaction.showModal(modal);
        }

        if (
            interaction.isModalSubmit() &&
            interaction.customId.startsWith(
                'announcement_modal:'
            )
        ) {
            const parts =
                interaction.customId.split(':');

            const mode = parts[2];

            const title =
                interaction.fields.getTextInputValue(
                    'announcement_title'
                );

            const message =
                interaction.fields.getTextInputValue(
                    'announcement_message'
                );

            const date =
                interaction.fields.getTextInputValue(
                    'announcement_date'
                );

            const time =
                interaction.fields.getTextInputValue(
                    'announcement_time'
                );

            const closure =
                interaction.fields.getTextInputValue(
                    'announcement_closure'
                );

            const channelId = parts[3];
            let targetChannel = null;

            if (channelId) {
                targetChannel = interaction.guild.channels.cache.get(channelId);
            }

            if (!targetChannel) {
                const { getGuildSettings } = require('../utils/guildSettings');
                const gSettings = getGuildSettings(interaction.guild.id);
                if (gSettings.announcementChannelId) {
                    targetChannel = interaction.guild.channels.cache.get(gSettings.announcementChannelId);
                }
            }

            if (!targetChannel && process.env.ANNOUNCEMENT_CHANNEL_ID) {
                targetChannel = interaction.guild.channels.cache.get(process.env.ANNOUNCEMENT_CHANNEL_ID.trim());
            }

            if (!targetChannel) {
                targetChannel = interaction.channel;
            }

            if (!targetChannel || !targetChannel.isTextBased()) {
                return interaction.reply({
                    content:
                        '❌ Channel pengumuman tidak ditemukan atau bukan channel teks.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const announcementEmbed =
                new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle(`📢 ${title}`)
                    .setDescription(`# ${message}`)
                    .addFields(
                        {
                            name: '📅 HARI & TANGGAL',
                            value: `**${date}**`,
                            inline: true
                        },
                        {
                            name: '🕐 JAM',
                            value: `**${time}**`,
                            inline: true
                        }
                    )
                    .setAuthor({
                        name: interaction.user.tag,
                        iconURL:
                            interaction.user.displayAvatarURL({
                                extension: 'png',
                                size: 256
                            })
                    })
                    .setThumbnail(
                        interaction.guild.iconURL({
                            extension: 'png',
                            size: 256
                        })
                    )
                    .setFooter({
                        text:
                            closure ||
                            `Pengumuman Resmi • ${interaction.guild.name}`
                    })
                    .setTimestamp();

            const sendOptions = {
                embeds: [announcementEmbed]
            };

            if (mode === 'all') {
                sendOptions.content = '@everyone';
                sendOptions.allowedMentions = {
                    parse: ['everyone']
                };
            }

            await targetChannel.send(sendOptions);

            return interaction.reply({
                content:
                    `✅ Pengumuman berhasil dikirim ke <#${targetChannel.id}>!`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error(
            'Announcement interaction error:',
            error
        );

        if (
            interaction.replied ||
            interaction.deferred
        ) {
            return interaction
                .editReply({
                    content:
                        '❌ Terjadi kesalahan saat memproses pengumuman.'
                })
                .catch(() => {});
        }

        return interaction
            .reply({
                content:
                    '❌ Terjadi kesalahan saat memproses pengumuman.',
                flags: MessageFlags.Ephemeral
            })
            .catch(() => {});
    }
}

module.exports = handleInteraction;