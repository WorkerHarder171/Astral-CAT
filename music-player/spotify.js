const SPOTIFY_CLIENT_ID =
    process.env.SPOTIFY_CLIENT_ID?.trim();

const SPOTIFY_CLIENT_SECRET =
    process.env.SPOTIFY_CLIENT_SECRET?.trim();

let accessToken = null;
let tokenExpiresAt = 0;

function isSpotifyUrl(value) {
    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();

        return [
            'open.spotify.com',
            'spotify.com',
            'www.spotify.com'
        ].includes(host);
    } catch {
        return false;
    }
}

function isSpotifyUri(value) {
    return /^spotify:track:[A-Za-z0-9]+$/i.test(
        value.trim()
    );
}

function extractSpotifyTrackId(value) {
    const input = value.trim();

    if (isSpotifyUri(input)) {
        return input.slice('spotify:track:'.length);
    }

    if (!isSpotifyUrl(input)) {
        return null;
    }

    try {
        const url = new URL(input);
        const parts = url.pathname
            .split('/')
            .filter(Boolean);

        const trackIndex = parts.indexOf('track');

        if (trackIndex === -1) {
            return null;
        }

        return parts[trackIndex + 1] || null;
    } catch {
        return null;
    }
}

async function getSpotifyAccessToken() {
    if (
        accessToken &&
        Date.now() < tokenExpiresAt
    ) {
        return accessToken;
    }

    if (
        !SPOTIFY_CLIENT_ID ||
        !SPOTIFY_CLIENT_SECRET
    ) {
        throw new Error(
            'SPOTIFY_CLIENT_ID atau SPOTIFY_CLIENT_SECRET belum diatur.'
        );
    }

    const credentials = Buffer
        .from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        )
        .toString('base64');

    const response = await fetch(
        'https://accounts.spotify.com/api/token',
        {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type':
                    'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        }
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `Spotify authentication gagal: ${response.status} ${body}`
        );
    }

    const data = await response.json();

    accessToken = data.access_token;

    tokenExpiresAt =
        Date.now() +
        (Number(data.expires_in || 3600) - 60) * 1000;

    return accessToken;
}

async function spotifyRequest(
    endpoint,
    retry = true
) {
    const token = await getSpotifyAccessToken();

    const response = await fetch(
        `https://api.spotify.com/v1${endpoint}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (
        response.status === 401 &&
        retry
    ) {
        accessToken = null;
        tokenExpiresAt = 0;

        return spotifyRequest(
            endpoint,
            false
        );
    }

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `Spotify API error: ${response.status} ${body}`
        );
    }

    return response.json();
}

async function getSpotifyTrack(trackId) {
    const data = await spotifyRequest(
        `/tracks/${trackId}`
    );

    const artists = data.artists
        ?.map(artist => artist.name)
        .join(', ') || 'Unknown Artist';

    return {
        source: 'spotify',
        id: data.id,
        title: data.name,
        artist: artists,
        album: data.album?.name || null,
        duration: Math.floor(
            Number(data.duration_ms || 0) / 1000
        ),
        thumbnail:
            data.album?.images?.[0]?.url || null,
        url: data.external_urls?.spotify || null,
        searchQuery: `${artists} - ${data.name}`
    };
}

async function searchSpotify(query) {
    const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '1'
    });

    const data = await spotifyRequest(
        `/search?${params.toString()}`
    );

    const track = data.tracks?.items?.[0];

    if (!track) {
        throw new Error(
            `Track Spotify tidak ditemukan: ${query}`
        );
    }

    const artists = track.artists
        ?.map(artist => artist.name)
        .join(', ') || 'Unknown Artist';

    return {
        source: 'spotify',
        id: track.id,
        title: track.name,
        artist: artists,
        album: track.album?.name || null,
        duration: Math.floor(
            Number(track.duration_ms || 0) / 1000
        ),
        thumbnail:
            track.album?.images?.[0]?.url || null,
        url: track.external_urls?.spotify || null,
        searchQuery: `${artists} - ${track.name}`
    };
}

async function resolveSpotify(query) {
    const value = query.trim();

    const trackId =
        extractSpotifyTrackId(value);

    if (trackId) {
        return getSpotifyTrack(trackId);
    }

    return searchSpotify(value);
}

module.exports = {
    isSpotifyUrl,
    isSpotifyUri,
    extractSpotifyTrackId,
    getSpotifyAccessToken,
    getSpotifyTrack,
    searchSpotify,
    resolveSpotify
};