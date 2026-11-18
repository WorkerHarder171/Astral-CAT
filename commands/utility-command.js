const { EmbedBuilder } = require('discord.js');

async function handleUtilityCommands(message, command, client, PREFIX) {
    if (command === 'help' || command === 'bantuan') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Panduan Perintah Bot')
            .setDescription(`Gunakan awalan \`${PREFIX}\` atau gunakan **Slash Commands (\`/\`)**:\n`)
            .addFields(
                { name: '⚡ Auto-Setup Server (1-Klik)', value: '`!auto-setup` atau `/auto-setup` *(Otomatis membuat role Men & Women, channel sambutan, pengumuman, dan panel role)*' },
                { name: '🚻 Claim Role Gender', value: '`!setup-role [#channel]` atau `/setup-role`' },
                { name: '📢 Pengumuman (Admin)', value: '`!announce [#channel]` atau `/announce`' },
                { name: '🎵 Musik', value: '`!play <lagu>`, `!skip`, `!pause`, `!resume`, `!stop`, `!queue`, `!np`' },
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