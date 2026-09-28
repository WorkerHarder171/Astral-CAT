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

function createHttpStream(url, redirectCount = 0) {
    if (redirectCount > 5) {
        return Promise.reject(new Error('Terlalu banyak redirect audio URL.'));
    }

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;

        const request = client.get(
            url,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
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

                    createHttpStream(nextUrl, redirectCount + 1)
                        .then(resolve)
                        .catch(reject);

                    return;
                }

                if (status !== 200) {
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

async function searchYoutube(query) {
    const result = await ytdlp(
        `ytsearch1:${query}`,
        {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            flatPlaylist: true,
            noCallHome: true
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
            noCallHome: true
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
    const info = await ytdlp(
        url,
        {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            noCallHome: true
        }
    );

    const formats = Array.isArray(info.formats)
        ? info.formats
        : [];

    const audioFormats = formats.filter(format => {
        return (
            format.vcodec === 'none' &&
            format.acodec &&
            format.url
        );
    });

    if (!audioFormats.length) {
        throw new Error('Audio stream YouTube tidak ditemukan.');
    }

    const opusFormats = audioFormats.filter(format => {
        return (
            String(format.acodec)
                .toLowerCase()
                .includes('opus') &&
            String(format.ext)
                .toLowerCase() === 'webm'
        );
    });

    if (opusFormats.length) {
        opusFormats.sort(
            (a, b) =>
                Number(b.abr || 0) -
                Number(a.abr || 0)
        );

        return {
            type: 'opus',
            url: opusFormats[0].url,
            format: opusFormats[0]
        };
    }

    audioFormats.sort(
        (a, b) =>
            Number(b.abr || 0) -
            Number(a.abr || 0)
    );

    return {
        type: 'ffmpeg',
        url: audioFormats[0].url,
        format: audioFormats[0]
    };
}

module.exports = {
    isYoutubeUrl,
    createHttpStream,
    createFFmpegStream,
    searchYoutube,
    getYoutubeInfo,
    getAudioStream
};