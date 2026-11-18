const { PermissionFlagsBits } = require('discord.js');
const { updateGuildSettings } = require('../utils/guildSettings');

async function handleWelcomeCommands(message, command, welcomeModule, setWelcomeChannel) {
    if (command === 'test-welcome' || command === 'testwelcome') {
        const loadingMsg = await message.reply('🎨 Sedang merender kartu sambutan...');
        try {
            const card = await welcomeModule.generateWelcomeCard(message.member);
            await message.channel.send({
                content: `🎉 Halo <@${message.author.id}>, selamat datang di **${message.guild.name}**! *(Mode Uji Coba)*`,
                files: [card]
            });
            await loadingMsg.delete().catch(() => {});
        } catch (err) {
            console.error('Error test welcome:', err);
            await loadingMsg.edit(`❌ Gagal membuat welcome card: ${err.message}`);
        }
    } 
    else if (command === 'setup-welcome') {
        if (
            !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Anda membutuhkan izin **Manage Server** atau **Administrator**!');
        }

        const targetChannel = message.mentions.channels.first();
        if (!targetChannel || !targetChannel.isTextBased()) {
            return message.reply('❌ Harap tag channel tujuan!\nContoh: `!setup-welcome #welcome`');
        }

        updateGuildSettings(message.guild.id, { welcomeChannelId: targetChannel.id });
        if (setWelcomeChannel) setWelcomeChannel(targetChannel.id);
        return message.reply(`✅ Channel sambutan untuk server ini berhasil diatur ke <#${targetChannel.id}>!`);
    }
}

module.exports = { handleWelcomeCommands };