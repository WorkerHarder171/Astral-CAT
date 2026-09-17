const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

/**
 * Menghasilkan gambar Welcome Banner Card sesuai dengan foto profil dan nama member
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<AttachmentBuilder>}
 */
async function generateWelcomeCard(member) {
    const width = 1024;
    const height = 500;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Gambar Background
    const bgPath = path.join(__dirname, 'assets', 'welcome-bg.jpg');
    if (fs.existsSync(bgPath)) {
        const background = await loadImage(bgPath);
        ctx.drawImage(background, 0, 0, width, height);
    } else {
        // Fallback gradien jika background belum ada
        const gradientBg = ctx.createLinearGradient(0, 0, width, height);
        gradientBg.addColorStop(0, '#1a1c29');
        gradientBg.addColorStop(1, '#0e1017');
        ctx.fillStyle = gradientBg;
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Lapisan bayangan gelap halus di bagian bawah agar teks putih sangat kontras dan mudah dibaca
    const overlayGradient = ctx.createLinearGradient(0, 150, 0, height);
    overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
    overlayGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
    overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, width, height);

    // 3. Konfigurasi Posisi Avatar Melingkar
    const avatarCenterX = width / 2; // 512
    const avatarCenterY = 175;
    const avatarRadius = 95;

    // 4. Gambar Avatar Member
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    let avatarImg;
    try {
        avatarImg = await loadImage(avatarUrl);
    } catch {
        // Fallback default avatar jika gagal memuat
        avatarImg = await loadImage(member.user.defaultAvatarURL);
    }

    // Gambar lingkaran avatar dengan kliping
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
        avatarImg,
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
    );
    ctx.restore();

    // 5. Gambar Bingkai Putih (White Border) melingkar di luar avatar
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2, true);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.closePath();
    ctx.restore();

    // 6. Gambar Teks "WELCOME"
    ctx.save();
    ctx.font = '900 64px Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillText('WELCOME', width / 2, 345);
    ctx.restore();

    // 7. Gambar Teks Username Member (dengan scaling otomatis jika nama panjang)
    const displayName = member.user.tag ? member.user.tag.toUpperCase() : member.user.username.toUpperCase();
    let fontSize = 38;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // Pastikan ukuran teks tidak melebihi lebar kartu (maksimal 900px)
    do {
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        fontSize -= 2;
    } while (ctx.measureText(displayName).width > 900 && fontSize > 20);

    ctx.fillText(displayName, width / 2, 410);
    ctx.restore();

    // 8. Konversi Canvas ke Buffer & Attachment Discord
    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'welcome-card.png' });
}

module.exports = {
    generateWelcomeCard
};
