require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events,
    MessageFlags
} = require('discord.js');

const musicModule = require('./music-player');
const welcomeModule = require('./welcome');

const { handleSetupRole } = require('./commands/claim-role');
const { handleAnnounce } = require('./commands/announcement');
const { handleMusicCommands } = require('./commands/music');
const { handleWelcomeCommands } = require('./commands/welcome');
const { handleUtilityCommands } = require('./commands/utility-command');

const handleInteractionRole =
    require('./events/interactionCreateRole');

const handleInteractionAnnouncement =
    require('./events/interactionAnnouncement');

const handleGuildMemberAdd =
    require('./events/guildMemberAdd');

const PREFIX = '!';

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

client.once(Events.ClientReady, () => {
    console.log('========================================');
    console.log(`🤖 Bot ${client.user.tag} online!`);
    console.log(
        `⚡ Siap menerima perintah dengan prefix: "${PREFIX}"`
    );
    console.log('========================================');
});

/*
|--------------------------------------------------------------------------
| MESSAGE COMMANDS
|--------------------------------------------------------------------------
*/

client.on(
    Events.MessageCreate,
    async (message) => {
        if (
            message.author.bot ||
            !message.guild ||
            !message.content.startsWith(PREFIX)
        ) {
            return;
        }

        const args = message.content
            .slice(PREFIX.length)
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
                    PREFIX
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
| LOGIN
|--------------------------------------------------------------------------
*/

if (!process.env.DISCORD_TOKEN) {
    console.error(
        '❌ DISCORD_TOKEN belum dikonfigurasi di .env'
    );

    process.exit(1);
}

client.login(
    process.env.DISCORD_TOKEN
);