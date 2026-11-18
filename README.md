# 🐾 Astral Cat — Multi-Server Discord Community Bot

<p align="center">
  <img src="assets/welcome-bg.jpg" alt="Astral Cat Banner" width="600" style="border-radius: 10px;" />
</p>

<p align="center">
  <b>Bot Discord serbaguna dengan pemutar musik berkualitas tinggi, sistem onboarding otomatis multi-server, pembagian role gender otomatis via DM, banner sambutan kanvas interaktif, dan web portal resmi.</b>
</p>

---

## 🌟 Fitur Utama

### 1. 🎵 Pemutar Musik Berkualitas Tinggi (Low Latency)
* Mendukung pencarian dan pemutaran lagu dari **YouTube** dan **Spotify**.
* Didukung oleh engine audio **`yt-dlp`** dan **`FFmpeg`** dengan fallback otomatis ke sistem Linux (`/usr/bin/ffmpeg`).
* Saluran teks khusus pemutar lagu: **`#🎵・play-music`**.
* Perintah lengkap: `play`, `pause`, `resume`, `skip`, `queue`, `nowplaying`, dan `stop`.

### 2. ⚡ Zero-Config Auto Onboarding (Multi-Server Ready)
* **Otomatisasi Join Server:** Ketika Astral Cat diundang ke server baru, bot akan otomatis membuat channel **`#🤖・bot`** dan langsung mengeksekusi inisialisasi server (`!setup-all`).
* **Smart Channel Reuse:** Mendeteksi channel yang sudah ada sebelumnya secara cerdas tanpa membuat channel dobel/duplikat.
* **Saluran Resmi yang Dibuat Otomatis:**
  * **`#🤖・bot`** — Saluran interaksi & eksekusi perintah bot.
  * **`#📜・rules`** — Tata tertib dan pedoman resmi server (read-only).
  * **`#📢・announcement`** — Pengumuman resmi dari admin/pengelola.
  * **`#🎵・play-music`** — Saluran teks perintah musik.
  * **`#👋・selamat-datang`** — Sambutan resmi member baru dengan banner kanvas otomatis.
* **One-Time Execution Lock:** Proteksi anti-redundansi agar konfigurasi tidak dieksekusi berulang kali.

### 3. 🚻 Sistem Role Gender & Onboarding DM (Anti-Redundansi)
* **Otomatisasi Role:** Membuat role **`Men ♂️`** dan **`Women ♀️`** secara otomatis dengan fitur **`hoist: true`** (anggota tampil terpisah dan rapi di sidebar kanan server).
* **Onboarding DM Otomatis:** Member baru yang bergabung langsung menerima pesan pribadi (DM) berisi kartu sambutan dan tombol interaktif untuk memilih role gender.
* **Broadcast ke Anggota Lama:** Perintah `!broadcast-role` atau `/broadcast-role` untuk mengirimkan kartu role ke seluruh anggota lama yang belum memiliki role secara aman (dilengkapi jeda rate limit 1 detik).
* **Riwayat DM Persisten:** ID member yang sudah menerima DM dicatat ke database internal agar tidak pernah menerima pesan ganda.
* **Pemicu Mandiri:** Setiap anggota dapat meminta kartu role kapan saja dengan mengetik `!claim-role` atau `/claim-role`.

### 4. 🎨 Banner Kartu Sambutan Kanvas (*Welcome Card Canvas*)
* Dibuat menggunakan engine grafis performa tinggi **`@napi-rs/canvas`**.
* Otomatis memuat foto profil member, bingkai melingkar, gradien latar belakang, dan tipografi username beresolusi tinggi.
* Otomatis dikirim ke channel sambutan saat ada anggota baru yang bergabung.

### 5. 📢 Panel Pengumuman Elegan
* Buat pengumuman ber-template mewah dengan embed terstruktur.
* Perintah: `!announce` atau `/announce`.

### 6. 🌐 Dashboard Web, Privacy Policy & Terms of Service
* Web server Express terintegrasi (`web/server.js`) dengan portal antarmuka modern.
* Halaman **Privacy Policy** (`/privacy`) dan **Terms of Service** (`/terms`) siap pakai untuk verifikasi resmi bot di Discord Developer Portal.
* Konfigurasi Vercel terintegrasi (`vercel.json`) untuk hosting statis dan serverless.

---

## 📋 Daftar Perintah

### 🎵 Musik (Bisa di `#🎵・play-music` atau channel bot)
| Prefix (`!`) | Slash Command (`/`) | Keterangan |
| :--- | :--- | :--- |
| `!play <judul/URL>` | `/play query:<judul/URL>` | Memutar musik dari YouTube / Spotify |
| `!pause` | `/pause` | Menjeda pemutaran lagu |
| `!resume` | `/resume` | Melanjutkan lagu yang dijeda |
| `!skip` | `/skip` | Melewati lagu ke antrean berikutnya |
| `!queue` | `/queue` | Menampilkan antrean daftar putar lagu |
| `!nowplaying` | `/nowplaying` | Menampilkan informasi lagu saat ini |
| `!stop` | `/stop` | Menghentikan musik dan membersihkan antrean |

### ⚙️ Konfigurasi & Onboarding Server (Khusus Admin)
| Prefix (`!`) | Slash Command (`/`) | Keterangan |
| :--- | :--- | :--- |
| `!setup-all` | `/setup-all [force]` | Konfigurasi otomatis seluruh channel & role server |
| `!auto-setup` | `/auto-setup [force]` | Alias untuk auto-setup server |
| `!broadcast-role [all]` | `/broadcast-role [semua]` | Kirim kartu role ke DM seluruh anggota lama |
| `!announce` | `/announce` | Mengirim pengumuman resmi server |
| `!setup-welcome <#ch>` | `/setup-welcome <#ch>` | Menentukan channel kartu sambutan manual |

### 👤 Umum & Anggota
| Prefix (`!`) | Slash Command (`/`) | Keterangan |
| :--- | :--- | :--- |
| `!claim-role` | `/claim-role` | Mengirimkan kartu pemilihan role ke DM pribadi kamu |
| `!help` | `/help` | Menampilkan daftar seluruh perintah bot |
| `!ping` | `/ping` | Memeriksa latensi pesan dan WebSocket Discord API |
| `!test-welcome` | `/test-welcome` | Uji coba render kartu sambutan kanvas untuk profilmu |

---

## 🛠️ Panduan Instalasi & Menjalankan Bot

### 1. Prasyarat Sistem
* **Node.js:** Versi 18 ke atas (Direkomendasikan Node.js LTS).
* **FFmpeg:** Di Linux, pastikan `ffmpeg` terinstal di sistem (`sudo pacman -S ffmpeg` di Arch, atau `sudo apt install ffmpeg` di Ubuntu/Debian).

### 2. Kloning Repositori & Install Dependensi
```bash
# Masuk ke direktori proyek
cd "Astral Cat"

# Install dependensi modul
npm install

# Download binary platform lokal (Linux/Windows)
node node_modules/youtube-dl-exec/scripts/postinstall.js
node node_modules/ffmpeg-static/install.js
```

### 3. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan masukkan kredensial bot kamu:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
PREFIX=!
PORT=3000

# Spotify API (Opsional untuk resolusi link Spotify)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

> [!IMPORTANT]
> **Wajib Mengaktifkan Gateway Intents di Discord Developer Portal:**
> 1. Buka [Discord Developer Portal](https://discord.com/developers/applications) > Pilih Bot kamu.
> 2. Masuk ke menu **Bot** > bagian **Privileged Gateway Intents**.
> 3. Aktifkan:
>    * ✅ **PRESENCE INTENT**
>    * ✅ **SERVER MEMBERS INTENT** *(Wajib agar bot bisa mendeteksi member baru & mengirim DM)*
>    * ✅ **MESSAGE CONTENT INTENT** *(Wajib agar bot bisa membaca perintah prefix `!`)*
> 4. Klik **Save Changes**.

---

## 🚀 Menjalankan Bot

### Mode Pengembangan (Development)
```bash
npm start
```

### Menjalankan 24/7 di Background Menggunakan PM2 (Rekomendasi)
```bash
# 1. Jalankan bot via PM2
npx pm2 start index.js --name "astral-cat"

# 2. Melihat status dan log bot
npx pm2 list
npx pm2 logs astral-cat

# 3. Simpan konfigurasi proses
npx pm2 save
```

---

## 📁 Struktur Direktori Proyek

```text
Astral Cat/
├── .data/                  # Database lokal JSON (guilds.json, pengaturan server)
├── assets/                 # Aset gambar & background welcome canvas
├── commands/               # Handler perintah bot (prefix & slash)
│   ├── announcement.js     # Modul pengumuman server
│   ├── auto-setup.js       # Otomatisasi setup channel & role anti-duplikasi
│   ├── broadcast-role.js   # Pengiriman kartu role DM ke anggota lama
│   ├── claim-role.js       # Panel pemilihan role gender
│   ├── music.js            # Handler perintah musik
│   ├── slashCommands.js    # Definisi & registrasi 17 Slash Commands global
│   └── utility-command.js  # Perintah utilitas (help, ping, dll)
├── events/                 # Event listener Discord.js
│   ├── guildMemberAdd.js   # Sambutan member baru & DM role otomatis
│   ├── interactionCreateRole.js # Interaksi tombol pemilihan role
│   └── interactionAnnouncement.js # Interaksi modal pengumuman
├── music-player/           # Audio engine streaming
│   ├── index.js            # Manajer antrean & Discord Voice Player
│   ├── spotify.js          # Resolusi lagu/playlist Spotify
│   └── youtube.js          # Ekstraksi YouTube via yt-dlp & FFmpeg PCM
├── utils/                  # Utilitas sistem
│   ├── guildInitializer.js# Inisialisasi zero-config & sinkronisasi guild
│   └── guildSettings.js   # Pengelola konfigurasi per-guild
├── web/                    # Dashboard Website & Halaman Kebijakan
│   ├── public/             # File web statis (index, privacy, terms, settings)
│   └── server.js           # Server Express & API endpoint
├── welcome.js              # Generator kartu banner grafis kanvas
├── vercel.json             # Konfigurasi deployment hosting Vercel
├── index.js                # Entry point bot Discord
└── package.json            # Daftar dependensi & metadata proyek
```

---

## 🔒 Hak Akses & Izin Bot (Permissions)
Agar bot dapat mengonfigurasi server secara otomatis dan memutar musik, berikan izin berikut saat mengundang bot ke server:
* `Administrator` **atau** kombinasi izin:
  * Manage Roles *(Kelola Peran)*
  * Manage Channels *(Kelola Saluran)*
  * View Channels, Send Messages, Embed Links, Attach Files
  * Connect & Speak *(Voice Channel)*

> [!TIP]
> **Penting:** Di **Server Settings > Roles** Discord, selalu pastikan posisi role bot **"Astral Cat" berada di atas role "Men" dan "Women"** agar bot memiliki wewenang untuk memberikan role kepada anggota.

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah lisensi [ISC](LICENSE).
Dikembangkan untuk komunitas server Discord yang modern, rapi, dan otomatis.
