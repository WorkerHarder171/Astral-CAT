const {
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../utils/guildSettings');
const { sendRoleDm } = require('../events/guildMemberAdd');
const { memberHasGenderRole } = require('../utils/roleManager');

// Kunci konkurensi: mencegah pengiriman broadcast ganda secara serentak di server yang sama
const activeBroadcasts = new Set();

/**
 * Mengirimkan pesan interaktif pemilihan role ke seluruh anggota lama yang belum memiliki role
 * Dilengkapi proteksi anti-redundansi penuh (cek role + histori penerimaan DM)
 * @param {import('discord.js').Guild} guild
 * @param {Object} options
 * @param {boolean} options.forceAll - Apakah kirim ke semua anggota meskipun sudah punya role
 * @param {Function} options.onProgress - Callback setiap proses pengiriman DM
 * @returns {Promise<{totalMembers: number, targetedMembers: number, sentCount: number, closedCount: number, alreadyHadRoleCount: number, alreadyRunning?: boolean}>}
 */
async function broadcastRoleDmToExistingMembers(guild, { forceAll = false, onProgress = null } = {}) {
    if (activeBroadcasts.has(guild.id)) {
        console.warn(`[Broadcast Role] Broadcast untuk ${guild.name} sedang berjalan. Permintaan diabaikan untuk mencegah redundansi.`);
        return {
            totalMembers: 0,
            humanMembers: 0,
            targetedMembers: 0,
            sentCount: 0,
            closedCount: 0,
            alreadyHadRoleCount: 0,
            alreadyRunning: true
        };
    }

    activeBroadcasts.add(guild.id);

    try {
        const settings = getGuildSettings(guild.id);
        const menRoleId = settings.roleMenId;
        const womenRoleId = settings.roleWomenId;
        const dmedUserIds = new Set(settings.dmedUserIds || []);

        // 1. Ambil seluruh anggota server
        const members = await guild.members.fetch();
        const humanMembers = members.filter(m => !m.user.bot);

        // 2. Filter anggota yang ditargetkan (Anti-Redundansi: cek role dan riwayat DM yang tersimpan)
        let targets = [];
        let alreadyHadRoleCount = 0;

        for (const [, member] of humanMembers) {
            const alreadyHasRole = memberHasGenderRole(member);
            const alreadyDmed = dmedUserIds.has(member.user.id);

            // JIKA USER SUDAH MEMILIKI ROLE ATAU SUDAH PERNAH DI-DM, LEWATI (JANGAN DI-DM LAGI)
            if (!forceAll && (alreadyHasRole || alreadyDmed)) {
                alreadyHadRoleCount++;
            } else {
                targets.push(member);
            }
        }

        let sentCount = 0;
        let closedCount = 0;
        let failCount = 0;

        // 3. Kirim DM secara berurutan dengan jeda waktu aman (rate limit safe)
        for (let i = 0; i < targets.length; i++) {
            const member = targets[i];

            try {
                const res = await sendRoleDm(member);
                if (res.success) {
                    sentCount++;
                    dmedUserIds.add(member.user.id);
                } else if (res.reason === 'DM_CLOSED') {
                    closedCount++;
                    // Catat juga bahwa member ini sudah dicoba agar tidak terus-menerus di-spam jika DM ditutup
                    dmedUserIds.add(member.user.id);
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }

            if (onProgress && typeof onProgress === 'function') {
                onProgress({
                    current: i + 1,
                    total: targets.length,
                    member,
                    sentCount,
                    closedCount
                });
            }

            // Jeda 1 detik antar DM untuk keamanan Rate Limit Discord API
            if (i < targets.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 4. Simpan riwayat ID anggota yang sudah menerima DM ke guildSettings
        updateGuildSettings(guild.id, {
            dmedUserIds: Array.from(dmedUserIds)
        });

        return {
            totalMembers: members.size,
            humanMembers: humanMembers.size,
            targetedMembers: targets.length,
            sentCount,
            closedCount,
            alreadyHadRoleCount,
            failCount
        };
    } finally {
        activeBroadcasts.delete(guild.id);
    }
}

/**
 * Handle command text: !broadcast-role [all]
 * @param {import('discord.js').Message} message
 * @param {string[]} args
 */
async function handleBroadcastRoleCommand(message, args = []) {
    if (
        !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        return message.reply('❌ Kamu memerlukan izin **Manage Server** atau **Administrator** untuk menjalankan broadcast role!');
    }

    if (activeBroadcasts.has(message.guild.id)) {
        return message.reply('⏳ **Broadcast sedang berjalan:** Mohon tunggu hingga proses broadcast sebelumnya selesai.');
    }

    const forceAll = args[0]?.toLowerCase() === 'all' || args[0]?.toLowerCase() === 'semua';

    const statusMsg = await message.reply({
        content: `⚡ **Memeriksa anggota server & memulai pengiriman DM anti-redundansi...**\nTarget: ${forceAll ? 'Seluruh anggota' : 'Anggota yang belum pernah dikirimi kartu role'}`
    });

    try {
        const stats = await broadcastRoleDmToExistingMembers(message.guild, {
            forceAll,
            onProgress: async ({ current, total, member }) => {
                if (current % 5 === 0 || current === total) {
                    await statusMsg.edit({
                        content: `⏳ **Sedang mengirimkan DM...** (${current}/${total}) ke @${member.user.username}`
                    }).catch(() => {});
                }
            }
        });

        const reportEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('📨 Broadcast Pemilihan Role Selesai!')
            .setDescription([
                `Pengiriman kartu pemilihan role ke DM anggota di **${message.guild.name}** telah selesai tanpa redundansi.`,
                '',
                '### 📊 Rincian Hasil:',
                `• 👥 **Total Anggota (Non-Bot):** ${stats.humanMembers} orang`,
                `• 🎯 **Target Anggota Baru:** ${stats.targetedMembers} orang`,
                `• ✅ **Berhasil Terkirim ke DM:** ${stats.sentCount} orang`,
                `• 🔒 **DM Tertutup (Privacy Settings):** ${stats.closedCount} orang`,
                `• ⏭️ **Sudah Memiliki Role / Sudah Pernah Dikirimi (Dilewati):** ${stats.alreadyHadRoleCount} orang`,
                '',
                '✨ *Anggota yang menerima DM bisa langsung menekan tombol Men ♂️ / Women ♀️ di DM mereka!*'
            ].join('\n'))
            .setFooter({ text: `Broadcast dieksekusi oleh ${message.author.tag} • Anti-Redundansi Aktif` })
            .setTimestamp();

        await statusMsg.edit({
            content: null,
            embeds: [reportEmbed]
        });
    } catch (err) {
        console.error('Error saat broadcast role:', err);
        await statusMsg.edit({
            content: `❌ Terjadi kesalahan saat broadcast role: ${err.message}`
        });
    }
}

module.exports = {
    broadcastRoleDmToExistingMembers,
    handleBroadcastRoleCommand
};
