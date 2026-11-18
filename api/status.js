module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
        online: false,
        uptime: 0,
        ping: -1,
        guildCount: 1,
        userCount: 0,
        botUser: {
            username: 'Astral Cat',
            tag: 'Astral Cat',
            avatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
        },
        prefix: '!',
        platform: 'Vercel Serverless'
    });
};
