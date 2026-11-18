// Astral Cat Web App Helper
async function fetchBotStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        const statusBadge = document.getElementById('bot-status-badge');
        const statusText = document.getElementById('bot-status-text');
        const pingEl = document.getElementById('stat-ping');
        const guildsEl = document.getElementById('stat-guilds');
        const usersEl = document.getElementById('stat-users');
        const uptimeEl = document.getElementById('stat-uptime');
        const botNameEl = document.getElementById('bot-name');
        const botAvatarEl = document.getElementById('bot-avatar');

        if (statusBadge && statusText) {
            const dot = statusBadge.querySelector('.pulse-dot');
            if (data.online) {
                if (dot) {
                    dot.className = 'pulse-dot online';
                }
                statusText.innerText = 'Online';
                statusBadge.title = `Bot aktif sebagai ${data.botUser?.tag || 'Astral Cat'}`;
            } else {
                if (dot) {
                    dot.className = 'pulse-dot offline';
                }
                statusText.innerText = 'Offline (Token Belum Valid)';
                statusBadge.title = 'Bot belum terhubung ke Discord Gateway';
            }
        }

        if (pingEl) {
            pingEl.innerText = data.ping >= 0 ? `${data.ping} ms` : '—';
        }
        if (guildsEl) {
            guildsEl.innerText = data.guildCount || 0;
        }
        if (usersEl) {
            usersEl.innerText = data.userCount ? data.userCount.toLocaleString() : 0;
        }
        if (uptimeEl) {
            uptimeEl.innerText = formatUptime(data.uptime);
        }
        if (botNameEl && data.botUser) {
            botNameEl.innerText = data.botUser.username;
        }
        if (botAvatarEl && data.botUser?.avatar) {
            botAvatarEl.src = data.botUser.avatar;
        }

        if (data.inviteUrl) {
            document.querySelectorAll('.btn-invite-bot').forEach(el => {
                el.href = data.inviteUrl;
            });
        }

        return data;
    } catch (err) {
        console.warn('Gagal memuat status bot:', err);
    }
}

function formatUptime(seconds) {
    if (!seconds || seconds <= 0) return '0 m';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}h ${h}j`;
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m ${seconds % 60}s`;
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    const bgClass = isSuccess 
        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' 
        : 'bg-rose-950/90 border-rose-500/40 text-rose-200';
    const icon = isSuccess ? '✅' : '⚠️';

    toast.className = `glass-panel px-5 py-3.5 flex items-center gap-3 border shadow-2xl rounded-xl z-50 text-sm font-medium ${bgClass} show`;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3800);
}

// Auto poll status every 10 seconds
document.addEventListener('DOMContentLoaded', () => {
    fetchBotStatus();
    setInterval(fetchBotStatus, 10000);
});
