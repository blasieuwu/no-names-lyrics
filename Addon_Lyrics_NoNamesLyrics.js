/**
 * @addon-type lyrics
 * @id no-names-lyrics
 * @name no name's lyrics
 * @version 1.0.0
 * @author blasieuwu
 * @description someone's attempt at lyric syncronization
 * @supports karaoke: true
 * @supports synced: true
 * @supports unsynced: true
 */

(() => {
    'use strict';

    const REPO_BASE = "https://raw.githubusercontent.com/blasieuwu/no-names-lyrics/main/lyrics";

    function slugify(str) {
        return (str || "")
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/[\s_]+/g, "_");
    }

    function extractTrackId(info, currentTrack) {
        const uri = info?.uri || currentTrack?.uri || currentTrack?.metadata?.uri || "";
        return window.LyricsService?.extractTrackId?.(uri)
            || window.ivLyricsTrackIdentity?.extractTrackId?.(uri)
            || String(uri).match(/^spotify:track:([^:]+)$/)?.[1]
            || "";
    }

    function parseLrc(lrcText) {
        const lines = lrcText.split("\n");
        const syncedLyrics = [];
        const plainLyricsArr = [];

        const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/;

        for (const line of lines) {
            const match = line.trim().match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const millis = parseInt(match[3].padEnd(3, "0"), 10);
                const timeMs = minutes * 60000 + seconds * 1000 + millis;
                const text = match[4].trim();

                syncedLyrics.push({
                    time: timeMs,
                    startTimeMs: timeMs,
                    text: text
                });
                if (text) plainLyricsArr.push(text);
            }
        }

        return {
            syncedLyrics,
            plainLyrics: plainLyricsArr.join("\n")
        };
    }

    function parseJsonLyrics(data) {
        if (!data || !Array.isArray(data.lyrics)) {
            return null;
        }

        const syncedLyrics = [];
        const plainLyricsArr = [];
        const karaokeLines = [];

        data.lyrics.forEach((line, index) => {
            const text = String(line?.text || "").trim();
            const startTime = Number(line?.time) || 0;
            const duration = Number(line?.duration) || 3000;
            const endTime = startTime + duration;

            const syllables = Array.isArray(line?.syllabus)
                ? line.syllabus.map(s => ({
                    text: String(s?.text || ""),
                    startTime: Number(s?.time) || startTime,
                    endTime: (Number(s?.time) || startTime) + (Number(s?.duration) || 0)
                }))
                : [];

            if (text) {
                syncedLyrics.push({
                    time: startTime,
                    startTimeMs: startTime,
                    text: text
                });

                plainLyricsArr.push(text);

                karaokeLines.push({
                    sourceIndex: index,
                    startTime,
                    endTime,
                    text,
                    originalText: text,
                    syllables: syllables.length ? syllables : undefined
                });
            }
        });

        const hasWordTiming = karaokeLines.some(line => line.syllables && line.syllables.length > 0);

        return {
            syncedLyrics,
            plainLyrics: plainLyricsArr.join("\n"),
            karaoke: hasWordTiming ? karaokeLines : null,
            karaokeGranularity: hasWordTiming ? "word" : null
        };
    }

    const NoNamesLyricsAddon = {
        id: "no-names-lyrics",
        name: "no name's lyrics",
        author: "blasieuwu",
        description: "someone's attempt at lyric syncronization",
        version: "1.0.0",
        supports: {
            karaoke: true,
            synced: true,
            unsynced: true
        },
        cacheVersion: 1,

        init() {
            console.log("[no name's lyrics] initialized");
        },

        getSettingsUI() {
            return null;
        },

        async getLyrics(info) {
            console.log("[no name's lyrics] getLyrics received info:", info);

            const currentTrack = Spicetify?.Player?.data?.item || Spicetify?.Player?.data?.track;

            const rawTitle = info?.title || info?.name || info?.metadata?.title || currentTrack?.metadata?.title || currentTrack?.name || "";
            const rawArtist = info?.artist || info?.artists?.[0]?.name || info?.metadata?.artist || currentTrack?.metadata?.artist_name || currentTrack?.artists?.[0]?.name || "";
            const trackId = extractTrackId(info, currentTrack);

            console.log("[no name's lyrics] extracted details:", { rawTitle, rawArtist, trackId });

            if (!rawTitle && !trackId) {
                console.warn("[no name's lyrics] could not resolve track details");
                return null;
            }

            const titleSlug = slugify(rawTitle);
            const artistSlug = slugify(rawArtist);

            // generate list of potential filenames to fetch from repo
            const targetFiles = [];
            const timestamp = Date.now();

            if (trackId) {
                targetFiles.push(`${trackId}.json`);
                targetFiles.push(`${trackId}.lrc`);
            }
            if (titleSlug && artistSlug) {
                targetFiles.push(`${titleSlug}-${artistSlug}.json`);
                targetFiles.push(`${titleSlug}-${artistSlug}.lrc`);
            }

            for (const file of targetFiles) {
                const fetchUrl = `${REPO_BASE}/${file}?t=${timestamp}`;
                console.log("[no name's lyrics] fetching:", fetchUrl);

                try {
                    const res = await fetch(fetchUrl);
                    if (!res.ok) continue;

                    if (file.endsWith(".json")) {
                        const jsonContent = await res.json();
                        const parsed = parseJsonLyrics(jsonContent);

                        if (parsed) {
                            console.log("[no name's lyrics] parsed json successfully:", parsed);
                            return {
                                isError: false,
                                result: {
                                    title: rawTitle,
                                    artist: rawArtist,
                                    syncedType: "LINE",
                                    syncedLyrics: parsed.syncedLyrics,
                                    lines: parsed.syncedLyrics,
                                    plainLyrics: parsed.plainLyrics,
                                    karaoke: parsed.karaoke,
                                    karaokeGranularity: parsed.karaokeGranularity,
                                    provider: "no name's lyrics"
                                }
                            };
                        }
                    } else if (file.endsWith(".lrc")) {
                        const lrcText = await res.text();
                        const parsed = parseLrc(lrcText);

                        console.log("[no name's lyrics] parsed lrc successfully:", parsed);
                        return {
                            isError: false,
                            result: {
                                title: rawTitle,
                                artist: rawArtist,
                                syncedType: "LINE",
                                syncedLyrics: parsed.syncedLyrics,
                                lines: parsed.syncedLyrics,
                                plainLyrics: parsed.plainLyrics,
                                provider: "no name's lyrics"
                            }
                        };
                    }
                } catch (err) {
                    console.error(`[no name's lyrics] error fetching ${file}:`, err);
                }
            }

            console.warn("[no name's lyrics] no matching lyrics file found");
            return null;
        }
    };

    function register() {
        if (window.LyricsAddonManager && typeof window.LyricsAddonManager.register === "function") {
            window.LyricsAddonManager.register(NoNamesLyricsAddon);
        } else {
            setTimeout(register, 100);
        }
    }

    register();
})();
