require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

// Modul Lokal (Arahkan ke modul YouTube handler yang baru)
const musicModule = require('./music-player/music');
const welcomeModule = require('./welcome');

// Command Handlers
const { handleSetupRole } = require('./commands/claim-role');
const { handleAnnounce } = require('./commands/announcement');
const { handleMusicCommands } = require('./commands/music');
const { handleWelcomeCommands } = require('./commands/welcome');
const { handleUtilityCommands } = require('./commands/utility-command');

// Event Handlers
const handleInteraction = require('./events/interactionCreate');
const handleGuildMemberAdd = require('./events/guildMemberAdd');

const PREFIX = '!';
let welcomeChannelId = process.env.WELCOME_CHANNEL_ID || '';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once(Events.ClientReady, () => {
    console.log(`========================================`);
    console.log(`🤖 Bot ${client.user.tag} online!`);
    console.log(`⚡ Siap menerima perintah dengan prefix: "${PREFIX}"`);
    console.log(`========================================`);
});

// Listener: Message Commands
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Route Command
    if (['setup-role', 'setup-gender'].includes(command)) {
        await handleSetupRole(message);
    } 
    else if (['announce', 'announcement', 'pengumuman', 'announce-all'].includes(command)) {
        await handleAnnounce(message, command, args);
    } 
    else if (['play', 'p', 'skip', 's', 'pause', 'resume', 'stop', 'dc', 'leave', 'queue', 'q', 'np', 'nowplaying'].includes(command)) {
        await handleMusicCommands(message, command, args, musicModule);
    } 
    else if (['test-welcome', 'testwelcome', 'setup-welcome'].includes(command)) {
        await handleWelcomeCommands(message, command, welcomeModule, (id) => welcomeChannelId = id);
    } 
    else if (['help', 'bantuan', 'ping', 'cekping', 'latency'].includes(command)) {
        await handleUtilityCommands(message, command, client, PREFIX);
    }
});

// Listener: Interactions (Button & Modal)
client.on(Events.InteractionCreate, (interaction) => handleInteraction(client, interaction));

// Listener: Member Join
client.on(Events.GuildMemberAdd, (member) => handleGuildMemberAdd(member, welcomeModule, () => welcomeChannelId));

client.login(process.env.DISCORD_TOKEN);