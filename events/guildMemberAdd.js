module.exports = async (member, welcomeModule, getWelcomeChannelId) => {
    try {
        let channel = null;
        const welcomeChannelId = getWelcomeChannelId();

        if (welcomeChannelId) {
            channel = member.guild.channels.cache.get(welcomeChannelId);
        }
        if (!channel) {
            channel = member.guild.channels.cache.find(
                (ch) => ch.isTextBased() && (ch.name.includes('welcome') || ch.name.includes('selamat-datang'))
            );
        }
        if (!channel) {
            channel = member.guild.systemChannel;
        }

        if (!channel || !channel.isTextBased()) return;

        const card = await welcomeModule.generateWelcomeCard(member);
        await channel.send({
            content: `🎉 Halo <@${member.id}>, selamat datang di **${member.guild.name}**!`,
            files: [card]
        });
    } catch (err) {
        console.error('Error welcome card:', err);
    }
};