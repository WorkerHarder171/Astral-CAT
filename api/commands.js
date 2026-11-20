const { getCommandsCatalog } = require('../config/commandsCatalog');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const prefix = process.env.PREFIX || '!';
    res.json({
        prefix,
        commands: getCommandsCatalog(prefix)
    });
};
