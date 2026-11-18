// Astral Cat Settings Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    loadChannelsAndRoles();

    const form = document.getElementById('settings-form');
    if (form) {
        form.addEventListener('submit', handleSaveSettings);
    }

    const previewBtn = document.getElementById('btn-preview-welcome');
    if (previewBtn) {
        previewBtn.addEventListener('click', updateWelcomePreview);
    }
});

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const cfg = data.config;
        
        // General
        const prefixInput = document.getElementById('prefix');
        if (prefixInput) prefixInput.value = cfg.prefix || '!';

        const portInput = document.getElementById('port');
        if (portInput) portInput.value = cfg.port || 3000;

        // Token
        const tokenBadge = document.getElementById('token-status-badge');
        if (tokenBadge) {
            if (cfg.hasDiscordToken) {
                tokenBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                tokenBadge.innerText = 'Token Terpasang (' + cfg.tokenMasked + ')';
            } else {
                tokenBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
                tokenBadge.innerText = 'Token Belum Dikonfigurasi';
            }
        }

        // Channels
        const welcomeChInput = document.getElementById('welcomeChannelId');
        if (welcomeChInput) welcomeChInput.value = cfg.welcomeChannelId || '';

        const announceChInput = document.getElementById('announcementChannelId');
        if (announceChInput) announceChInput.value = cfg.announcementChannelId || '';

        // Roles
        const roleMenInput = document.getElementById('roleMenId');
        if (roleMenInput) roleMenInput.value = cfg.roleMenId || '';

        const roleWomenInput = document.getElementById('roleWomenId');
        if (roleWomenInput) roleWomenInput.value = cfg.roleWomenId || '';

        // Spotify
        const spotifyClientInput = document.getElementById('spotifyClientId');
        if (spotifyClientInput) spotifyClientInput.value = cfg.spotifyClientId || '';

        const spotifyRedirectInput = document.getElementById('spotifyRedirectUrl');
        if (spotifyRedirectInput) spotifyRedirectInput.value = cfg.spotifyRedirectUrl || '';

        const spotifyBadge = document.getElementById('spotify-status-badge');
        if (spotifyBadge) {
            if (cfg.hasSpotifySecret && cfg.spotifyClientId) {
                spotifyBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                spotifyBadge.innerText = 'Spotify API Terhubung';
            } else {
                spotifyBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30';
                spotifyBadge.innerText = 'Opsional / Belum Diatur';
            }
        }

    } catch (err) {
        console.error('Gagal memuat konfigurasi:', err);
        showToast('Gagal memuat pengaturan: ' + err.message, 'error');
    }
}

async function loadChannelsAndRoles() {
    try {
        const [chRes, roRes] = await Promise.all([
            fetch('/api/channels'),
            fetch('/api/roles')
        ]);
        const chData = await chRes.json();
        const roData = await roRes.json();

        // Populate channels datalist
        const chDatalist = document.getElementById('channel-options');
        if (chDatalist && chData.channels && chData.channels.length > 0) {
            chDatalist.innerHTML = chData.channels
                .map(c => `<option value="${c.id}">#${c.name} (${c.guildName})</option>`)
                .join('');
        }

        // Populate roles datalist
        const roDatalist = document.getElementById('role-options');
        if (roDatalist && roData.roles && roData.roles.length > 0) {
            roDatalist.innerHTML = roData.roles
                .map(r => `<option value="${r.id}">@${r.name} (${r.guildName})</option>`)
                .join('');
        }
    } catch (e) {
        // Abaikan jika bot belum online
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save');
    const originalText = saveBtn ? saveBtn.innerHTML : 'Simpan';
    
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="animate-spin inline-block mr-2">🔄</span> Menyimpan...';
    }

    const formData = {
        prefix: document.getElementById('prefix')?.value || '!',
        port: document.getElementById('port')?.value || '3000',
        welcomeChannelId: document.getElementById('welcomeChannelId')?.value || '',
        announcementChannelId: document.getElementById('announcementChannelId')?.value || '',
        roleMenId: document.getElementById('roleMenId')?.value || '',
        roleWomenId: document.getElementById('roleWomenId')?.value || '',
        spotifyClientId: document.getElementById('spotifyClientId')?.value || '',
        spotifyRedirectUrl: document.getElementById('spotifyRedirectUrl')?.value || ''
    };

    const tokenInput = document.getElementById('discordToken');
    if (tokenInput && tokenInput.value.trim()) {
        formData.discordToken = tokenInput.value.trim();
    }

    const spotifySecretInput = document.getElementById('spotifyClientSecret');
    if (spotifySecretInput && spotifySecretInput.value.trim()) {
        formData.spotifyClientSecret = spotifySecretInput.value.trim();
    }

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        showToast('✨ Konfigurasi bot berhasil disimpan dan diperbarui!', 'success');
        
        // Reset sensitive inputs
        if (tokenInput) tokenInput.value = '';
        if (spotifySecretInput) spotifySecretInput.value = '';

        // Reload data
        loadSettings();
    } catch (err) {
        showToast('❌ Gagal menyimpan pengaturan: ' + err.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}

function updateWelcomePreview() {
    const previewImg = document.getElementById('welcome-preview-img');
    const usernameInput = document.getElementById('preview-username');
    const username = encodeURIComponent(usernameInput?.value || 'Astral Member');
    
    if (previewImg) {
        previewImg.classList.add('opacity-40');
        previewImg.src = `/api/preview/welcome?username=${username}&t=${Date.now()}`;
        previewImg.onload = () => {
            previewImg.classList.remove('opacity-40');
        };
    }
}

function toggleVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btnEl.innerText = 'Sembunyikan';
    } else {
        input.type = 'password';
        btnEl.innerText = 'Lihat';
    }
}
