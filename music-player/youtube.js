const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const ytdlp = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');

function isYoutubeUrl(value) {
    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();

        return [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'music.youtube.com',
            'youtu.be'
        ].includes(host);
    } catch {
        return false;
    }
}

function createHttpStream(url, redirectCount = 0, customHeaders = {}) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak redirect audio URL.'));
    }

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;

        const request = client.get(
            url,
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
                    Accept: '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    Range: 'bytes=0-',
                    ...customHeaders
                }
            },
            response => {
                const status = response.statusCode || 0;

                if (
                    [301, 302, 303, 307, 308].includes(status) &&
                    response.headers.location
                ) {
                    response.resume();

                    const nextUrl = new URL(
                        response.headers.location,
                        url
                    ).toString();

                    createHttpStream(nextUrl, redirectCount + 1, customHeaders)
                        .then(resolve)
                        .catch(reject);

                    return;
                }

                if (status !== 200 && status !== 206) {
                    response.resume();
                    reject(
                        new Error(
                            `Gagal mengambil audio stream. HTTP ${status}`
                        )
                    );
                    return;
                }

                resolve(response);
            }
        );

        request.on('error', reject);
    });
}

function createFFmpegStream(inputStream) {
    const ffmpeg = spawn(
        ffmpegPath,
        [
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            'pipe:0',
            '-f',
            's16le',
            '-ar',
            '48000',
            '-ac',
            '2',
            'pipe:1'
        ],
        {
            stdio: ['pipe', 'pipe', 'pipe']
        }
    );

    inputStream.pipe(ffmpeg.stdin);

    inputStream.on('error', error => {
        ffmpeg.stdin.destroy(error);
    });

    ffmpeg.stderr.on('data', data => {
        const message = data.toString().trim();

        if (message) {
            console.error('[FFmpeg]', message);
        }
    });

    return ffmpeg;
}

function createAudioStream(url) {
    const ytProcess = ytdlp.exec(
        url,
        {
            output: '-',
            format: 'bestaudio/best',
            quiet: true,
            noWarnings: true,
            jsRuntimes: 'node',
            extractorArgs: 'youtube:player_client=android'
        },
        {
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );

    const ffmpeg = spawn(
        ffmpegPath,
        [
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            'pipe:0',
            '-f',
            's16le',
            '-ar',
            '48000',
            '-ac',
            '2',
            'pipe:1'
        ],
        {
            stdio: ['pipe', 'pipe', 'pipe']
        }
    );

    ytProcess.stdout.pipe(ffmpeg.stdin);

    ytProcess.catch(() => {});

    ytProcess.on('error', () => {});
    ytProcess.stdout.on('error', () => {});
    ffmpeg.stdin.on('error', () => {});
    ffmpeg.stdout.on('error', () => {});
    ffmpeg.on('error', () => {});

    ytProcess.stderr.on('data', data => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('JavaScript runtime')) {
            console.error('[yt-dlp]', msg);
        }
    });

    ffmpeg.stderr.on('data', data => {
        const message = data.toString().trim();
        if (message) {
            console.error('[FFmpeg]', message);
        }
    });

    return {
        stream: ffmpeg.stdout,
        processes: [ytProcess, ffmpeg],
        cleanup: () => {
            try {
                if (!ytProcess.killed) ytProcess.kill();
            } catch {}
            try {
                if (!ffmpeg.killed) ffmpeg.kill();
            } catch {}
        }
    };
}

async function searchYoutube(query) {
    const result = await ytdlp(
        `ytsearch1:${query}`,
        {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            flatPlaylist: true,
            jsRuntimes: 'node',
            extractorArgs: 'youtube:player_client=android'
        }
    );

    const entry = result?.entries?.[0];

    if (!entry) {
        throw new Error(`Video YouTube tidak ditemukan: ${query}`);
    }

    return {
        source: 'youtube',
        id: entry.id,
        title: entry.title,
        url: entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`,
        duration: Number(entry.duration || 0),
        thumbnail: entry.thumbnail || null
    };
}

async function getYoutubeInfo(url) {
    const result = await ytdlp(
        url,
        {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            jsRuntimes: 'node',
            extractorArgs: 'youtube:player_client=android'
        }
    );

    return {
        source: 'youtube',
        id: result.id,
        title: result.title,
        url: result.webpage_url || url,
        duration: Number(result.duration || 0),
        thumbnail: result.thumbnail || null,
        formats: result.formats || []
    };
}

async function getAudioStream(url) {
    return createAudioStream(url);
}

module.exports = {
    isYoutubeUrl,
    createHttpStream,
    createFFmpegStream,
    createAudioStream,
    searchYoutube,
    getYoutubeInfo,
    getAudioStream
};