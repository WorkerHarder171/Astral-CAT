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

client.once(Events.ClientReady, () => {
    console.log('========================================');
    console.log(`🤖 Bot ${client.user.tag} online!`);
    console.log(
        `⚡ Siap menerima perintah dengan prefix: "${getPrefix()}"`
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
| BOT ADDED TO NEW GUILD (AUTO ONBOARDING)
|--------------------------------------------------------------------------
*/

client.on(
    Events.GuildCreate,
    async (guild) => {
        try {
            console.log(
                `🎉 Astral Cat ditambahkan ke server baru: ${guild.name} (ID: ${guild.id}, Members: ${guild.memberCount})`
            );

            // Cari channel sistem atau teks channel yang dapat dikirimi pesan
            const channel =
                guild.systemChannel ||
                guild.channels.cache.find(
                    c =>
                        c.isTextBased() &&
                        c
                            .permissionsFor(guild.members.me)
                            ?.has(['SendMessages', 'EmbedLinks'])
                );

            if (!channel) return;

            const prefix = getPrefix();
            const embed = new EmbedBuilder()
                .setColor(0x7C3AED)
                .setTitle('🐾 Halo! Astral Cat Siap Digunakan')
                .setDescription([
                    `Terima kasih telah menambahkan **Astral Cat** ke server **${guild.name}**!`,
                    '',
                    'Bot ini sudah **langsung siap digunakan** tanpa perlu pengaturan rumit:',
                    '',
                    `• 🎵 **Musik:** Masuk ke voice channel lalu ketik \`${prefix}play <lagu>\``,
                    `• 🎨 **Kartu Sambutan:** Ketik \`${prefix}setup-welcome #channel\` untuk memilih channel banner`,
                    `• 🚻 **Role Gender:** Ketik \`${prefix}setup-role\` *(Role Men & Women akan otomatis dideteksi atau dibuatkan!)*`,
                    `• 📢 **Pengumuman:** Ketik \`${prefix}announce #channel\` untuk membuat pengumuman ber-template`,
                    `• ⚡ **Bantuan Lengkap:** Ketik \`${prefix}help\``,
                    '',
                    '💡 *Tips Admin: Pastikan posisi Role bot "Astral Cat" berada cukup tinggi di Server Settings > Roles agar bisa mengelola role dengan lancar.*'
                ].join('\n'))
                .setThumbnail(
                    client.user.displayAvatarURL({ dynamic: true })
                )
                .setFooter({
                    text: 'Astral Cat Community Bot • Siap di Setiap Server'
                })
                .setTimestamp();

            await channel.send({ embeds: [embed] }).catch(() => {});
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
