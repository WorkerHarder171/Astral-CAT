require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events,
    MessageFlags,
    EmbedBuilder
} = require('discord.js');

const musicModule = require('./music-player');
const welcomeModule = require('./welcome');

const { handleSetupRole } = require('./commands/claim-role');
const { handleAnnounce } = require('./commands/announcement');
const { handleMusicCommands } = require('./commands/music');
const { handleWelcomeCommands } = require('./commands/welcome');
const { handleUtilityCommands } = require('./commands/utility-command');

const {
    autoInitializeGuild,
    autoInitializeAllGuilds
} = require('./utils/guildInitializer');

const {
    registerSlashCommands,
    handleSlashCommand
} = require('./commands/slashCommands');

const handleInteractionRole =
    require('./events/interactionCreateRole');

const handleInteractionAnnouncement =
    require('./events/interactionAnnouncement');

const handleGuildMemberAdd =
    require('./events/guildMemberAdd');

const { startWebServer } = require('./web/server');

const getPrefix = () => process.env.PREFIX || '!';

let welcomeChannelId =
    process.env.WELCOME_CHANNEL_ID?.trim() || '';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

/*
|--------------------------------------------------------------------------
| CLIENT READY
|--------------------------------------------------------------------------
*/

client.once(Events.ClientReady, async () => {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    console.log('========================================');
    console.log(`🤖 Bot ${client.user.tag} online!`);
    console.log(`⚡ Siap menerima perintah dengan prefix: "${getPrefix()}" & Slash Command ("/")`);
    console.log(`🔗 Link Invite Bot (1-Klik untuk Menambahkan ke Server):`);
    console.log(`👉 ${inviteUrl}`);
    console.log('========================================');

    // 1. Daftarkan Global Slash Commands
    await registerSlashCommands(client);

    // 2. Inisialisasi otomatis semua server (Zero-Configuration Onboarding)
    await autoInitializeAllGuilds(client);
});

/*
|--------------------------------------------------------------------------
| MESSAGE COMMANDS
|--------------------------------------------------------------------------
*/

client.on(
    Events.MessageCreate,
    async (message) => {
        const prefix = getPrefix();
        if (
            message.author.bot ||
            !message.guild ||
            !message.content.startsWith(prefix)
        ) {
            return;
        }

        const args = message.content
            .slice(prefix.length)
            .trim()
            .split(/\s+/);

        const command =
            args.shift()?.toLowerCase();

        if (!command) {
            return;
        }

        try {
            /*
            |--------------------------------------------------------------------------
            | AUTO-SETUP COMMAND (1-KLIK ZERO CONFIG)
            |--------------------------------------------------------------------------
            */

            if (
                [
                    'auto-setup',
                    'autosetup',
                    'setup-all',
                    'setup-server',
                    'auto-config'
                ].includes(command)
            ) {
                const { handleAutoSetupCommand } = require('./commands/auto-setup');
                await handleAutoSetupCommand(message);
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | ROLE COMMAND
            |--------------------------------------------------------------------------
            */

            if (
                [
                    'setup-role',
                    'setup-gender'
                ].includes(command)
            ) {
                await handleSetupRole(message);
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | ANNOUNCEMENT COMMAND
            |--------------------------------------------------------------------------
            */

            if (
                [
                    'announce',
                    'announcement',
                    'pengumuman',
                    'announce-all'
                ].includes(command)
            ) {
                await handleAnnounce(
                    message,
                    command,
                    args
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | MUSIC COMMAND
            |--------------------------------------------------------------------------
            */

            if (
                [
                    'play',
                    'p',
                    'skip',
                    's',
                    'pause',
                    'resume',
                    'stop',
                    'dc',
                    'leave',
                    'queue',
                    'q',
                    'np',
                    'nowplaying'
                ].includes(command)
            ) {
                await handleMusicCommands(
                    message,
                    command,
                    args,
                    musicModule
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | WELCOME COMMAND
            |--------------------------------------------------------------------------
            */

            if (
                [
                    'test-welcome',
                    'testwelcome',
                    'setup-welcome'
                ].includes(command)
            ) {
                await handleWelcomeCommands(
                    message,
                    command,
                    welcomeModule,
                    (id) => {
                        welcomeChannelId = id;
                    }
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | UTILITY COMMAND
            |--------------------------------------------------------------------------
            */

            if (
                [
                    'help',
                    'bantuan',
                    'ping',
                    'cekping',
                    'latency'
                ].includes(command)
            ) {
                await handleUtilityCommands(
                    message,
                    command,
                    client,
                    prefix
                );

                return;
            }

        } catch (error) {
            console.error(
                `Error command "${command}":`,
                error
            );

            if (!message.replied) {
                await message
                    .reply(
                        '❌ Terjadi kesalahan saat menjalankan command.'
                    )
                    .catch(() => {});
            }
        }
    }
);

/*
|--------------------------------------------------------------------------
| INTERACTION HANDLER
|--------------------------------------------------------------------------
|
| Semua Button dan Modal ditangani di sini.
|
*/

client.on(
    Events.InteractionCreate,
    async (interaction) => {
        try {
            /*
            |--------------------------------------------------------------------------
            | SLASH COMMANDS (/)
            |--------------------------------------------------------------------------
            */

            if (interaction.isChatInputCommand()) {
                await handleSlashCommand(client, interaction);
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | ROLE BUTTON / MODAL
            |--------------------------------------------------------------------------
            */

            await handleInteractionRole(
                client,
                interaction
            );

            /*
            |--------------------------------------------------------------------------
            | ANNOUNCEMENT BUTTON / MODAL
            |--------------------------------------------------------------------------
            */

            await handleInteractionAnnouncement(
                client,
                interaction
            );

        } catch (error) {
            console.error(
                'Interaction handler error:',
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction
                    .editReply({
                        content:
                            '❌ Terjadi kesalahan saat memproses interaction.'
                    })
                    .catch(() => {});

                return;
            }

            await interaction
                .reply({
                    content:
                        '❌ Terjadi kesalahan saat memproses interaction.',
                    flags: MessageFlags.Ephemeral
                })
                .catch(() => {});
        }
    }
);

/*
|--------------------------------------------------------------------------
| MEMBER JOIN
|--------------------------------------------------------------------------
*/

client.on(
    Events.GuildMemberAdd,
    async (member) => {
        try {
            await handleGuildMemberAdd(member);
        } catch (error) {
            console.error(
                'GuildMemberAdd error:',
                error
            );
        }
    }
);

/*
|--------------------------------------------------------------------------
| BOT ADDED TO NEW GUILD (AUTO ONBOARDING & INSTANT PROVISIONING)
|--------------------------------------------------------------------------
*/

client.on(
    Events.GuildCreate,
    async (guild) => {
        try {
            console.log(
                `🎉 Astral Cat ditambahkan ke server baru: ${guild.name} (ID: ${guild.id}, Members: ${guild.memberCount})`
            );

            // 1. Daftarkan Slash Commands instan untuk server baru ini
            await registerSlashCommands(client, guild);

            // 2. Jalankan Auto-Provisioning & Sapaan Onboarding
            await autoInitializeGuild(guild, { sendGreeting: true });
        } catch (error) {
            console.error('Error saat bot masuk ke server baru:', error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| WEB DASHBOARD & LOGIN
|--------------------------------------------------------------------------
*/

// Memulai Web Dashboard & API Server
startWebServer(client);

// Login ke Discord Gateway
if (!process.env.DISCORD_TOKEN) {
    console.warn('⚠️  DISCORD_TOKEN belum dikonfigurasi di .env.');
    console.log('👉 Buka dashboard di http://localhost:3000/settings untuk memasukkan token bot.');
} else {
    client.login(process.env.DISCORD_TOKEN).catch((err) => {
        console.error('❌ Gagal login ke Discord:', err.message);
        console.log('👉 Masukkan token baru di dashboard: http://localhost:3000/settings');
    });
}
