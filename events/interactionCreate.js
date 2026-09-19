const {
    MessageFlags
} = require('discord.js');

module.exports = async (client, interaction) => {
    const ROLE_MEN_ID =
        process.env.ROLE_MEN_ID?.trim() || '';

    const ROLE_WOMEN_ID =
        process.env.ROLE_WOMEN_ID?.trim() || '';

    /*
    |--------------------------------------------------------------------------
    | GENDER BUTTON
    |--------------------------------------------------------------------------
    */

    if (interaction.isButton()) {
        const { customId } = interaction;

        if (
            !customId.startsWith('claim_gender_man:') &&
            !customId.startsWith('claim_gender_woman:')
        ) {
            /*
            |--------------------------------------------------------------------------
            | REPORT ROLE
            |--------------------------------------------------------------------------
            */

            if (customId === 'report_role') {
                return;
            }

            return;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        /*
        |--------------------------------------------------------------------------
        | GET GUILD ID
        |--------------------------------------------------------------------------
        */

        const [action, guildId] = customId.split(':');

        if (!guildId) {
            return interaction.editReply({
                content: '❌ Guild ID tidak ditemukan.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | GET GUILD
        |--------------------------------------------------------------------------
        */

        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            return interaction.editReply({
                content:
                    '❌ Server tidak ditemukan atau bot sudah tidak berada di server.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | GET MEMBER
        |--------------------------------------------------------------------------
        */

        let member;

        try {
            member = await guild.members.fetch(
                interaction.user.id
            );
        } catch (error) {
            console.error(
                '❌ Gagal mendapatkan member:',
                error
            );

            return interaction.editReply({
                content:
                    '❌ Kamu tidak ditemukan sebagai member server.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | DETERMINE ROLE
        |--------------------------------------------------------------------------
        */

        const isMan =
            action === 'claim_gender_man';

        const targetRoleId = isMan
            ? ROLE_MEN_ID
            : ROLE_WOMEN_ID;

        const oppositeRoleId = isMan
            ? ROLE_WOMEN_ID
            : ROLE_MEN_ID;

        const genderName = isMan
            ? 'Man'
            : 'Woman';

        /*
        |--------------------------------------------------------------------------
        | CHECK ENV
        |--------------------------------------------------------------------------
        */

        if (!targetRoleId) {
            return interaction.editReply({
                content:
                    `❌ Role **${genderName}** belum dikonfigurasi di \`.env\`.`
            });
        }

        /*
        |--------------------------------------------------------------------------
        | GET TARGET ROLE
        |--------------------------------------------------------------------------
        */

        const targetRole =
            guild.roles.cache.get(targetRoleId);

        if (!targetRole) {
            return interaction.editReply({
                content:
                    `❌ Role **${genderName}** tidak ditemukan di server.`
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK TARGET ROLE
        |--------------------------------------------------------------------------
        */

        if (member.roles.cache.has(targetRoleId)) {
            return interaction.editReply({
                content:
                    `⚠️ Kamu sudah memiliki role **${targetRole.name}**.`
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK OPPOSITE ROLE
        |--------------------------------------------------------------------------
        */

        if (
            oppositeRoleId &&
            member.roles.cache.has(oppositeRoleId)
        ) {
            return interaction.editReply({
                content: [
                    '⚠️ Kamu sudah memiliki role gender.',
                    '',
                    'Kamu tidak dapat memilih role gender lainnya.',
                    '',
                    'Jika terjadi kesalahan, silakan hubungi admin.'
                ].join('\n')
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK BOT MEMBER
        |--------------------------------------------------------------------------
        */

        const botMember = guild.members.me;

        if (!botMember) {
            return interaction.editReply({
                content:
                    '❌ Bot member tidak ditemukan.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK MANAGE ROLES
        |--------------------------------------------------------------------------
        */

        if (
            !botMember.permissions.has('ManageRoles')
        ) {
            return interaction.editReply({
                content:
                    '❌ Bot tidak memiliki permission **Manage Roles**.'
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ROLE HIERARCHY
        |--------------------------------------------------------------------------
        */

        if (
            targetRole.position >=
            botMember.roles.highest.position
        ) {
            return interaction.editReply({
                content: [
                    `❌ Bot tidak dapat memberikan role **${targetRole.name}**.`,
                    '',
                    'Pastikan role bot berada di atas role tersebut.'
                ].join('\n')
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ADD ROLE
        |--------------------------------------------------------------------------
        */

        try {
            await member.roles.add(
                targetRole,
                `Claim gender: ${genderName}`
            );

            /*
            |--------------------------------------------------------------------------
            | DISABLE BUTTONS
            |--------------------------------------------------------------------------
            */

            const disabledComponents =
                interaction.message.components.map(row => ({
                    type: row.type,
                    components: row.components.map(component => ({
                        type: component.type,
                        style: component.style,
                        label: component.label,
                        emoji: component.emoji,
                        custom_id: component.customId,
                        disabled: true
                    }))
                }));

            await interaction.message.edit({
                components: disabledComponents
            }).catch(() => {});

            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            return interaction.editReply({
                content:
                    `✅ Berhasil mendapatkan role **${targetRole.name}**!`
            });

        } catch (error) {
            console.error(
                '❌ Error claim gender:',
                error
            );

            return interaction.editReply({
                content: [
                    '❌ Gagal memberikan role.',
                    '',
                    'Pastikan:',
                    '• Bot memiliki permission **Manage Roles**',
                    '• Role bot berada di atas role target',
                    '• Role target masih tersedia'
                ].join('\n')
            });
        }
    }

    /*
    |--------------------------------------------------------------------------
    | MODAL INTERACTION
    |--------------------------------------------------------------------------
    */

    if (interaction.isModalSubmit()) {
        return;
    }
};