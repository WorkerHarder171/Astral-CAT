const announcementTemplates = {
    stream: {
        label: 'Stream',
        emoji: '🎥',
        title: 'LIVE STREAM DIMULAI',
        message:
            'Halo semuanya! Jangan lupa merapat dan ikut menyaksikan live stream kita.',
        date: '',
        time: '',
        closure:
            'Terima kasih sudah meramaikan stream! ❤️'
    },

    maintenance: {
        label: 'Maintenance',
        emoji: '🔧',
        title: 'MAINTENANCE SERVER',
        message:
            'Server akan melakukan maintenance untuk meningkatkan performa dan stabilitas layanan. Selama proses maintenance, beberapa fitur mungkin tidak dapat digunakan.',
        date: '',
        time: '',
        closure:
            'Terima kasih atas perhatian dan pengertiannya.'
    },

    general: {
        label: 'General',
        emoji: '📢',
        title: 'PENGUMUMAN SERVER',
        message:
            'Berikut informasi terbaru untuk seluruh anggota server.',
        date: '',
        time: '',
        closure:
            'Terima kasih atas perhatian dan kerja samanya.'
    },

    event: {
        label: 'Event',
        emoji: '🎉',
        title: 'EVENT SERVER',
        message:
            'Akan segera dilaksanakan event server. Jangan sampai ketinggalan dan pastikan kamu ikut berpartisipasi!',
        date: '',
        time: '',
        closure:
            'Sampai bertemu di event! 🎉'
    }
};

module.exports = announcementTemplates;