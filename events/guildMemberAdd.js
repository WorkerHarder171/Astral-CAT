const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = async (member) => {
    if (member.user.bot) {
        return;
    }

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