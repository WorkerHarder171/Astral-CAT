const { EmbedBuilder } = require('discord.js');

async function handleUtilityCommands(message, command, client, PREFIX) {
    if (command === 'help' || command === 'bantuan') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Panduan Perintah Bot')
            .setDescription(`Gunakan awalan \`${PREFIX}\` di awal setiap perintah:\n`)
            .addFields(
                { name: '🚻 Claim Role Gender', value: '`!setup-role [#channel]`' },
                { name: '📢 Pengumuman (Admin)', value: '`!announce <#channel> [Judul |] <Pesan>`\n`!announce-all <#channel> [Judul |] <Pesan>`' },
                { name: '🎵 Musik', value: '`!play`, `!skip`, `!pause`, `!resume`, `!stop`, `!queue`, `!np`' },
                { name: '👋 Sambutan', value: '`!test-welcome`, `!setup-welcome <#channel>`' },
                { name: '⚙️ Umum', value: '`!help`, `!ping`' }
            )
            .setFooter({ text: `System • ${message.guild.name}` })
            .setTimestamp();

        return message.channel.send({ embeds: [helpEmbed] });
    }

    if (['ping', 'cekping', 'latency'].includes(command)) {
        const sent = await message.reply('🏓 Menghitung latensi...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const pingEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📨 Latensi Pesan', value: `\`${latency} ms\``, inline: true },
                { name: '🌐 API Discord', value: `\`${apiLatency} ms\``, inline: true }
            )
            .setTimestamp();

        return sent.edit({ content: null, embeds: [pingEmbed] });
    }
}

module.exports = { handleUtilityCommands };