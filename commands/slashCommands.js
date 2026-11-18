const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require('discord.js');

const musicModule = require('../music-player');
const welcomeModule = require('../welcome');
const { createRolePanel } = require('./claim-role');
const { handleAnnounce } = require('./announcement');
const { updateGuildSettings, getGuildSettings } = require('../utils/guildSettings');

// Definisi Struktur Slash Commands
const commandsData = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Menampilkan buku panduan lengkap fitur dan perintah Astral Cat'),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Mengecek kecepatan latensi bot dan koneksi gateway Discord'),

    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Memutar musik dari YouTube atau Spotify di voice channel kamu')
        .addStringOption(option =>
            option
                .setName('lagu')
                .setDescription('Judul lagu atau URL YouTube / Spotify')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Lewati lagu yang sedang diputar saat ini'),

    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Jeda pemutaran musik sementara'),

    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Lanjutkan kembali pemutaran musik yang dijeda'),

    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Hentikan musik, bersihkan antrean, dan keluar dari voice channel'),

    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Lihat daftar antrean musik di server ini'),

    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Lihat informasi lagu yang sedang diputar'),

    new SlashCommandBuilder()
        .setName('setup-role')
        .setDescription('Kirim panel pilihan role gender interaktif (Men & Women)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel tempat panel role akan dikirimkan (default: channel saat ini)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Atur channel penerimaan kartu sambutan anggota baru')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel tujuan kartu sambutan')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('auto-setup')
        .setDescription('Konfigurasi otomatis: buat role gender, channel sambutan, panel role, & pengumuman')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
        .setName('test-welcome')
        .setDescription('Uji coba render kartu sambutan kanvas untuk profilmu'),

    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Buka panel pengumuman resmi server ber-template elegan')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel target pengumuman (default: channel saat ini)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('semua')
                .setDescription('Sebut semua orang (@everyone) dalam pengumuman')
                .setRequired(false)
        )
];

/**
 * Daftarkan slash commands ke Discord API
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild|null} guild - Jika disetel, daftarkan instan ke guild tersebut
 */
async function registerSlashCommands(client, guild = null) {
    try {
        if (guild) {
            await guild.commands.set(commandsData);
            console.log(`⚡ [Slash] Perintah slash instan terdaftar di server: ${guild.name}`);
        } else {
            if (!client.application) return;
            await client.application.commands.set(commandsData);
            console.log(`🌐 [Slash] ${commandsData.length} Perintah slash global berhasil didaftarkan ke seluruh server!`);
        }
    } catch (error) {
        console.error('Gagal mendaftarkan slash command:', error);
    }
}

/**
 * Adapter pesan sintetis agar modul musicPlayer yang berbasis Message dapat memproses Interaction
 */
function createInteractionMessageAdapter(interaction, initialArgs = []) {
    return {
        member: interaction.member,
        guild: interaction.guild,
        channel: interaction.channel,
        author: interaction.user,
        reply: async (payload) => {
            if (interaction.deferred || interaction.replied) {
                return interaction.followUp(payload);
            }
            return interaction.reply(payload);
        }
    };
}

/**
 * Tangani eksekusi Slash Commands
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleSlashCommand(client, interaction) {
    const { commandName } = interaction;

    try {
        /*
        |--------------------------------------------------------------------------
        | HELP
        |--------------------------------------------------------------------------
        */
        if (commandName === 'help') {
            const prefix = process.env.PREFIX || '!';
            const embed = new EmbedBuilder()
                .setColor(0x7C3AED)
                .setTitle('🤖 Buku Panduan Lengkap Astral Cat')
                .setDescription([
                    `Kamu bisa menggunakan perintah bot melalui awalan **\`${prefix}\`** ataupun **Slash Command (\`/\`)**!`,
                    '',
                    '🎵 **Fitur Pemutar Musik:**',
                    `• \`/play <lagu>\` atau \`${prefix}play <lagu>\` — Putar lagu YouTube/Spotify`,
                    `• \`/skip\` atau \`${prefix}skip\` — Lewati lagu saat ini`,
                    `• \`/pause\` atau \`${prefix}pause\` — Jeda lagu`,
                    `• \`/resume\` atau \`${prefix}resume\` — Lanjutkan pemutaran`,
                    `• \`/stop\` atau \`${prefix}stop\` — Keluar dari voice`,
                    `• \`/queue\` atau \`${prefix}queue\` — Daftar antrean`,
                    `• \`/nowplaying\` atau \`${prefix}np\` — Status lagu sekarang`,
                    '',
                    '🚻 **Fitur Role Gender Otomatis:**',
                    `• \`/setup-role\` atau \`${prefix}setup-role\` — Pasang tombol claim role Men & Women (Role otomatis dibuat jika belum ada!)`,
                    '',
                    '🎨 **Fitur Kartu Sambutan (Canvas):**',
                    `• \`/setup-welcome\` atau \`${prefix}setup-welcome #ch\` — Atur channel sambutan`,
                    `• \`/test-welcome\` atau \`${prefix}test-welcome\` — Coba lihat kartu sambutan`,
                    '',
                    '📢 **Fitur Pengumuman Elegan:**',
                    `• \`/announce\` atau \`${prefix}announce\` — Buka formulir pengumuman ber-template`,
                    '',
                    '⚙️ **Utilitas:**',
                    `• \`/ping\` — Cek latensi dan kondisi koneksi bot`
                ].join('\n'))
                .setFooter({ text: `Astral Cat • ${interaction.guild.name}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        /*
        |--------------------------------------------------------------------------
        | PING
        |--------------------------------------------------------------------------
        */
        if (commandName === 'ping') {
            const start = Date.now();
            await interaction.deferReply();
            const latency = Date.now() - start;
            const apiLatency = Math.round(client.ws.ping);

            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: '📨 Latensi Interaksi', value: `\`${latency} ms\``, inline: true },
                    { name: '🌐 Gateway Discord', value: `\`${apiLatency} ms\``, inline: true }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        /*
        |--------------------------------------------------------------------------
        | MUSIC COMMANDS
        |--------------------------------------------------------------------------
        */
        if (['play', 'skip', 'pause', 'resume', 'stop', 'queue', 'nowplaying'].includes(commandName)) {
            const voiceChannel = interaction.member?.voice?.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ Kamu harus berada di dalam Voice Channel terlebih dahulu!',
                    ephemeral: true
                });
            }

            if (commandName === 'play') {
                const query = interaction.options.getString('lagu');
                const adapter = createInteractionMessageAdapter(interaction);
                await interaction.deferReply();
                await musicModule.play(adapter, [query]);
                return;
            }

            if (commandName === 'skip') {
                const adapter = createInteractionMessageAdapter(interaction);
                await musicModule.skip(adapter);
                return interaction.reply({ content: '⏭️ Lagu berhasil dilewati!', ephemeral: true });
            }

            if (commandName === 'pause') {
                const adapter = createInteractionMessageAdapter(interaction);
                await musicModule.pause(adapter);
                return interaction.reply({ content: '⏸️ Pemutaran musik dijeda.', ephemeral: true });
            }

            if (commandName === 'resume') {
                const adapter = createInteractionMessageAdapter(interaction);
                await musicModule.resume(adapter);
                return interaction.reply({ content: '▶️ Pemutaran musik dilanjutkan.', ephemeral: true });
            }

            if (commandName === 'stop') {
                const adapter = createInteractionMessageAdapter(interaction);
                await musicModule.stop(adapter);
                return interaction.reply({ content: '⏹️ Musik dihentikan dan bot telah meninggalkan voice channel.', ephemeral: true });
            }

            if (commandName === 'queue') {
                const adapter = createInteractionMessageAdapter(interaction);
                await musicModule.queue(adapter);
                return interaction.reply({ content: '📜 Daftar antrean telah dikirimkan ke channel.', ephemeral: true });
            }

            if (commandName === 'nowplaying') {
                const adapter = createInteractionMessageAdapter(interaction);
                await musicModule.nowPlaying(adapter);
                return interaction.reply({ content: '🎵 Informasi lagu dikirimkan ke channel.', ephemeral: true });
            }
        }

        /*
        |--------------------------------------------------------------------------
        | SETUP ROLE
        |--------------------------------------------------------------------------
        */
        if (commandName === 'setup-role') {
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const panel = await createRolePanel(interaction.guild);
            await targetChannel.send(panel);

            return interaction.reply({
                content: `✅ Panel role gender berhasil dikirimkan ke <#${targetChannel.id}>!`,
                ephemeral: true
            });
        }

        /*
        |--------------------------------------------------------------------------
        | SETUP WELCOME
        |--------------------------------------------------------------------------
        */
        if (commandName === 'setup-welcome') {
            const targetChannel = interaction.options.getChannel('channel');
            updateGuildSettings(interaction.guild.id, { welcomeChannelId: targetChannel.id });

            return interaction.reply({
                content: `✅ Channel kartu sambutan server ini berhasil diatur ke <#${targetChannel.id}>!`,
                ephemeral: true
            });
        }

        /*
        |--------------------------------------------------------------------------
        | TEST WELCOME
        |--------------------------------------------------------------------------
        */
        if (commandName === 'test-welcome') {
            await interaction.deferReply();
            const card = await welcomeModule.generateWelcomeCard(interaction.member);
            return interaction.editReply({
                content: `🎉 Halo <@${interaction.user.id}>, berikut adalah pratinjau kartu sambutan **${interaction.guild.name}**:`,
                files: [card]
            });
        }

        /*
        |--------------------------------------------------------------------------
        | AUTO-SETUP
        |--------------------------------------------------------------------------
        */
        if (commandName === 'auto-setup') {
            await interaction.deferReply();
            const { executeAutoSetup } = require('./auto-setup');
            const resultEmbed = await executeAutoSetup(interaction.guild, interaction.member);
            return interaction.editReply({ embeds: [resultEmbed] });
        }

        /*
        |--------------------------------------------------------------------------
        | ANNOUNCE
        |--------------------------------------------------------------------------
        */
        if (commandName === 'announce') {
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const isAll = interaction.options.getBoolean('semua') || false;

            const adapter = {
                member: interaction.member,
                guild: interaction.guild,
                channel: interaction.channel,
                mentions: {
                    channels: {
                        first: () => targetChannel
                    }
                },
                reply: async (msg) => interaction.reply({ ...msg, ephemeral: true })
            };

            await handleAnnounce(adapter, isAll ? 'announce-all' : 'announce');
        }

    } catch (error) {
        console.error(`Error pada slash command /${commandName}:`, error);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({
                content: `❌ Terjadi kesalahan saat memproses perintah: ${error.message}`,
                ephemeral: true
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: `❌ Terjadi kesalahan saat memproses perintah: ${error.message}`,
                ephemeral: true
            }).catch(() => {});
        }
    }
}

module.exports = {
    commandsData,
    registerSlashCommands,
    handleSlashCommand
};
