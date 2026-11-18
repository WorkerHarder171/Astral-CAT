const {
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const { getGuildSettings } = require('../utils/guildSettings');
const { sendRoleDm } = require('../events/guildMemberAdd');

/**
 * Mengirimkan pesan interaktif pemilihan role ke seluruh anggota lama yang belum memiliki role
 * @param {import('discord.js').Guild} guild
 * @param {Object} options
 * @param {boolean} options.forceAll - Apakah kirim ke semua anggota meskipun sudah punya role
 * @param {Function} options.onProgress - Callback setiap proses pengiriman DM
 * @returns {Promise<{totalMembers: number, targetedMembers: number, sentCount: number, closedCount: number, alreadyHadRoleCount: number}>}
 */
async function broadcastRoleDmToExistingMembers(guild, { forceAll = false, onProgress = null } = {}) {
    const settings = getGuildSettings(guild.id);
    const menRoleId = settings.roleMenId;
    const womenRoleId = settings.roleWomenId;

    // 1. Ambil seluruh anggota server
    const members = await guild.members.fetch();
    const humanMembers = members.filter(m => !m.user.bot);

    // 2. Filter anggota yang ditargetkan
    let targets = [];
    let alreadyHadRoleCount = 0;

    for (const [, member] of humanMembers) {
        const hasMen = menRoleId && member.roles.cache.has(menRoleId);
        const hasWomen = womenRoleId && member.roles.cache.has(womenRoleId);

        if (!forceAll && (hasMen || hasWomen)) {
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
            } else if (res.reason === 'DM_CLOSED') {
                closedCount++;
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

    return {
        totalMembers: members.size,
        humanMembers: humanMembers.size,
        targetedMembers: targets.length,
        sentCount,
        closedCount,
        alreadyHadRoleCount,
        failCount
    };
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

    const forceAll = args[0]?.toLowerCase() === 'all' || args[0]?.toLowerCase() === 'semua';

    const statusMsg = await message.reply({
        content: `⚡ **Memulai pengiriman DM pemilihan role...**\nTarget: ${forceAll ? 'Seluruh anggota' : 'Anggota yang belum memiliki role'}`
    });

    try {
        const stats = await broadcastRoleDmToExistingMembers(message.guild, {
            forceAll,
            onProgress: async ({ current, total, member }) => {
                if (current % 5 === 0 || current === total) {
                    await statusMsg.edit({
                        content: `⏳ **Sedang memproses DM...** (${current}/${total}) sedang mengirim ke @${member.user.username}`
                    }).catch(() => {});
                }
            }
        });

        const reportEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('📨 Broadcast Pemilihan Role Selesai!')
            .setDescription([
                `Pengiriman kartu pemilihan role ke DM anggota di **${message.guild.name}** telah selesai.`,
                '',
                '### 📊 Rincian Hasil:',
                `• 👥 **Total Anggota (Non-Bot):** ${stats.humanMembers} orang`,
                `• 🎯 **Target Anggota:** ${stats.targetedMembers} orang`,
                `• ✅ **Berhasil Terkirim ke DM:** ${stats.sentCount} orang`,
                `• 🔒 **DM Tertutup (Privacy Settings):** ${stats.closedCount} orang`,
                `• ⏭️ **Sudah Memiliki Role (Dilewati):** ${stats.alreadyHadRoleCount} orang`,
                '',
                '✨ *Anggota yang menerima DM bisa langsung menekan tombol Men ♂️ / Women ♀️ di DM mereka!*'
            ].join('\n'))
            .setFooter({ text: `Broadcast dieksekusi oleh ${message.author.tag}` })
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
