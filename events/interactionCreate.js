const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { createRolePanel } = require('../commands/claim-role');

module.exports = async (client, interaction) => {
    const ROLE_MEN_ID = process.env.ROLE_MEN_ID || '';
    const ROLE_WOMEN_ID = process.env.ROLE_WOMEN_ID || '';

    if (interaction.isButton()) {
        const { customId, member, guild } = interaction;

        if (customId === 'report_role') {
            const modal = new ModalBuilder()
                .setCustomId('modal_report_role')
                .setTitle('Laporan Salah Input Role');

            const reasonInput = new TextInputBuilder()
                .setCustomId('report_reason')
                .setLabel('Jelaskan masalah / role yang benar:')
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(5)
                .setMaxLength(500)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            return await interaction.showModal(modal);
        }

        if (customId !== 'role_men' && customId !== 'role_women') return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const isMen = customId === 'role_men';
        const targetRoleId = isMen ? ROLE_MEN_ID : ROLE_WOMEN_ID;
        const oppositeRoleId = isMen ? ROLE_WOMEN_ID : ROLE_MEN_ID;
        const roleName = isMen ? 'Men' : 'Women';

        const targetRole = guild.roles.cache.get(targetRoleId);
        if (!targetRole) {
            return interaction.editReply({ content: `⚠️ Role **${roleName}** tidak ditemukan!` });
        }

        try {
            if (member.roles.cache.has(targetRoleId)) {
                return interaction.editReply({ content: `⚠️ Anda sudah memiliki role **${targetRole.name}**!` });
            }

            if (member.roles.cache.has(oppositeRoleId)) {
                return interaction.editReply({ content: `⚠️ Anda sudah memiliki role gender lain. Gunakan fitur laporan jika terjadi kesalahan.` });
            }

            await member.roles.add(targetRole);
            const updatedPanel = await createRolePanel(guild);
            await interaction.message.edit(updatedPanel).catch(() => {});

            return interaction.editReply({ content: `✅ Berhasil mendapatkan role **${targetRole.name}**!` });
        } catch (err) {
            console.error('Error interaction role:', err);
            return interaction.editReply({ content: `❌ Gagal memperbarui role: ${err.message}` });
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_report_role') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const reason = interaction.fields.getTextInputValue('report_reason');
        const guild = interaction.guild;
        const member = interaction.member;

        let adminUser = null;
        if (process.env.ADMIN_USER_ID) {
            adminUser = await client.users.fetch(process.env.ADMIN_USER_ID.trim()).catch(() => null);
        }
        if (!adminUser && guild) {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) adminUser = owner.user;
        }

        if (!adminUser) {
            return interaction.editReply({ content: '❌ Tidak dapat menemukan Admin/Owner server.' });
        }

        const reportEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🚨 Laporan Salah Input Role Gender')
            .addFields(
                { name: '👤 Member', value: `${member.user.tag} (<@${member.id}>)` },
                { name: '📝 Pesan', value: `\`\`\`${reason}\`\`\`` }
            )
            .setTimestamp();

        try {
            await adminUser.send({ embeds: [reportEmbed] });
            return interaction.editReply({ content: `✅ Laporan telah dikirim ke Admin (**${adminUser.tag}**)!` });
        } catch (err) {
            return interaction.editReply({ content: `⚠️ Gagal mengirim DM ke Admin. Pastikan DM Admin terbuka.` });
        }
    }
};