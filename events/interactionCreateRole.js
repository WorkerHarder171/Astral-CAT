const {
    MessageFlags
} = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../utils/guildSettings');

async function resolveOrCreateGenderRole(guild, isMan) {
    const settings = getGuildSettings(guild.id);
    const configuredRoleId = isMan ? settings.roleMenId : settings.roleWomenId;

    // 1. Cek jika ID yang tersimpan di guild settings valid di server ini
    if (configuredRoleId && guild.roles.cache.has(configuredRoleId)) {
        return guild.roles.cache.get(configuredRoleId);
    }

    // 2. Cek fallback dari .env jika cocok dengan server ini
    const envRoleId = isMan ? process.env.ROLE_MEN_ID?.trim() : process.env.ROLE_WOMEN_ID?.trim();
    if (envRoleId && guild.roles.cache.has(envRoleId)) {
        if (isMan) updateGuildSettings(guild.id, { roleMenId: envRoleId });
        else updateGuildSettings(guild.id, { roleWomenId: envRoleId });
        return guild.roles.cache.get(envRoleId);
    }

    // 3. Cari role yang sudah ada di server berdasarkan nama
    const keywords = isMan
        ? ['man', 'men', 'male', 'pria', 'laki-laki', 'laki', 'cowok']
        : ['woman', 'women', 'female', 'wanita', 'perempuan', 'cewek'];

    let foundRole = guild.roles.cache.find(r =>
        keywords.some(kw => r.name.toLowerCase().trim() === kw || r.name.toLowerCase().includes(kw))
    );

    if (foundRole) {
        if (!foundRole.hoist) {
            await foundRole.edit({ hoist: true }).catch(() => {});
        }
        if (isMan) updateGuildSettings(guild.id, { roleMenId: foundRole.id });
        else updateGuildSettings(guild.id, { roleWomenId: foundRole.id });
        return foundRole;
    }

    // 4. Jika belum ada, otomatis buat role baru jika bot memiliki izin ManageRoles
    const botMember = guild.members.me;
    if (botMember && botMember.permissions.has('ManageRoles')) {
        try {
            foundRole = await guild.roles.create({
                name: isMan ? 'Men ♂️' : 'Women ♀️',
                color: isMan ? 0x3498DB : 0xE91E63,
                hoist: true,
                reason: 'Astral Cat: Otomatis membuat role gender (Tampil di sidebar kanan)'
            });
            console.log(`✅ Otomatis membuat role "${foundRole.name}" (Sidebar aktif) di server: ${guild.name}`);
            if (isMan) updateGuildSettings(guild.id, { roleMenId: foundRole.id });
            else updateGuildSettings(guild.id, { roleWomenId: foundRole.id });
            return foundRole;
        } catch (err) {
            console.error(`Gagal membuat role otomatis di ${guild.name}:`, err.message);
        }
    }

    return null;
}

module.exports = async (client, interaction) => {

    /*
    |--------------------------------------------------------------------------
    | GENDER BUTTON
    |--------------------------------------------------------------------------
    */

    if (interaction.isButton()) {
        const { customId } = interaction;

        // Handler Onboarding Quick Action Buttons
        if (customId.startsWith('quick_auto_setup:')) {
            const [, gId] = customId.split(':');
            const g = client.guilds.cache.get(gId) || interaction.guild;
            if (
                !interaction.member.permissions.has('ManageGuild') &&
                !interaction.member.permissions.has('Administrator')
            ) {
                return interaction.reply({
                    content: '❌ Anda membutuhkan izin **Manage Server** atau **Administrator** untuk menjalankan auto-setup!',
                    ephemeral: true
                });
            }
            await interaction.deferReply();
            const { executeAutoSetup } = require('../commands/auto-setup');
            const resultEmbed = await executeAutoSetup(g, interaction.member);
            return interaction.editReply({ embeds: [resultEmbed] });
        }

        if (customId.startsWith('quick_setup_role:')) {
            const [, gId] = customId.split(':');
            const g = client.guilds.cache.get(gId) || interaction.guild;
            if (
                !interaction.member.permissions.has('ManageRoles') &&
                !interaction.member.permissions.has('Administrator')
            ) {
                return interaction.reply({
                    content: '❌ Anda membutuhkan izin **Manage Roles** atau **Administrator** untuk memasang panel role!',
                    ephemeral: true
                });
            }
            const { createRolePanel } = require('../commands/claim-role');
            const panel = await createRolePanel(g);
            await interaction.channel.send(panel);
            return interaction.reply({
                content: `✅ Panel role gender berhasil dipasang di channel ini (<#${interaction.channel.id}>)!`,
                ephemeral: true
            });
        }

        if (customId.startsWith('quick_test_welcome:')) {
            await interaction.deferReply({ ephemeral: true });
            const welcomeModule = require('../welcome');
            const card = await welcomeModule.generateWelcomeCard(interaction.member);
            return interaction.editReply({
                content: `🎉 Halo <@${interaction.user.id}>, berikut adalah pratinjau kartu sambutan:`,
                files: [card]
            });
        }

        if (customId.startsWith('quick_help:')) {
            const prefix = process.env.PREFIX || '!';
            const { EmbedBuilder } = require('discord.js');
            const helpEmbed = new EmbedBuilder()
                .setColor(0x7C3AED)
                .setTitle('📖 Buku Panduan Singkat Astral Cat')
                .setDescription([
                    `Prefix Server: **\`${prefix}\`** atau gunakan **Slash Commands (\`/\`)**`,
                    '',
                    '• 🎵 **Musik:** `!play <lagu>` atau `/play`',
                    '• 🚻 **Panel Role:** `!setup-role` atau `/setup-role`',
                    '• 🎨 **Kartu Sambutan:** `!setup-welcome` atau `/setup-welcome`',
                    '• 📢 **Pengumuman:** `!announce` atau `/announce`',
                    '• 🏓 **Cek Ping:** `!ping` atau `/ping`'
                ].join('\n'))
                .setFooter({ text: interaction.guild.name });
            return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        }

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
                    `❌ Kamu tidak ditemukan sebagai member di server **${guild.name}**.`
            });
        }

        /*
        |--------------------------------------------------------------------------
        | DETERMINE ROLE
        |--------------------------------------------------------------------------
        */

        const isMan =
            action === 'claim_gender_man';

        const genderName = isMan
            ? 'Man'
            : 'Woman';

        /*
        |--------------------------------------------------------------------------
        | GET TARGET & OPPOSITE ROLE (SMART MULTI-GUILD RESOLVER)
        |--------------------------------------------------------------------------
        */

        const targetRole = await resolveOrCreateGenderRole(guild, isMan);
        const oppositeRole = await resolveOrCreateGenderRole(guild, !isMan);

        if (!targetRole) {
            return interaction.editReply({
                content:
                    `❌ Role **${genderName}** tidak ditemukan di server **${guild.name}** dan bot tidak memiliki izin **Manage Roles** untuk membuatnya secara otomatis.`
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK TARGET ROLE
        |--------------------------------------------------------------------------
        */

        if (member.roles.cache.has(targetRole.id)) {
            return interaction.editReply({
                content:
                    `⚠️ Kamu sudah memiliki role **${targetRole.name}** di server **${guild.name}**.`
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK OPPOSITE ROLE
        |--------------------------------------------------------------------------
        */

        if (
            oppositeRole &&
            member.roles.cache.has(oppositeRole.id)
        ) {
            return interaction.editReply({
                content: [
                    `⚠️ Kamu sudah memiliki role gender di server **${guild.name}**.`,
                    '',
                    'Kamu tidak dapat memilih role gender lainnya.',
                    '',
                    'Jika terjadi kesalahan, silakan hubungi admin server.'
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
                    `❌ Bot member tidak ditemukan di server **${guild.name}**.`
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
                    `❌ Bot tidak memiliki permission **Manage Roles** di server **${guild.name}**.`
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
                    `❌ Bot tidak dapat memberikan role **${targetRole.name}** di server **${guild.name}**.`,
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

            // Nonaktifkan tombol hanya jika pesan berada di DM pribadi pengguna
            if (!interaction.inGuild() || interaction.channel?.isDMBased?.()) {
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
            }

            /*
            |--------------------------------------------------------------------------
            | SUCCESS
            |--------------------------------------------------------------------------
            */

            return interaction.editReply({
                content:
                    `✅ Berhasil mendapatkan role **${targetRole.name}** di server **${guild.name}**!`
            });

        } catch (error) {
            console.error(
                '❌ Error claim gender:',
                error
            );

            return interaction.editReply({
                content: [
                    `❌ Gagal memberikan role di server **${guild.name}**.`,
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