/**
 * @addon-type lyrics
 * @id no-names-lyrics
 * @name no name's lyrics
 * @version 1.0.0
 * @author blasieuwu
 * @description someone's attempt at lyric syncronization
 * @supports karaoke: false
 * @supports synced: true
 * @supports unsynced: true
 */

(() => {
  // clean slugification
  function slugify(str) {
    return (str || "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // remove punctuation
      .trim()
      .replace(/[\s_]+/g, "_"); // replace spaces with underscore
  }

  // helper to parse LRC format timestamp [mm:ss.xx] into milliseconds & seconds
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

  const NoNamesLyricsAddon = {
    id: "no-names-lyrics",
    name: "no name's lyrics",
    author: "blasieuwu",
    description: "someone's attempt at lyric syncronization",
    version: "1.0.0",
    supports: {
      karaoke: false,
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
      console.log("[no name's lyrics] getLyrics called with info:", info);

      if (!info) return null;

      // extract title and artist from potential metadata paths
      const rawTitle = info.title || info.name || info.metadata?.title || "";
      const rawArtist = info.artist || info.artists?.[0]?.name || info.metadata?.artist || "";

      if (!rawTitle) {
        console.warn("[no name's lyrics] missing track title");
        return null;
      }

      const repoBase = "https://raw.githubusercontent.com/blasieuwu/no-names-lyrics/main/lyrics";
      
      const titleSlug = slugify(rawTitle);
      const artistSlug = slugify(rawArtist);

      const lrcFilename = `${titleSlug}-${artistSlug}.lrc`;
      const jsonFilename = `${titleSlug}-${artistSlug}.json`;

      const lrcUrl = `${repoBase}/${lrcFilename}?t=${Date.now()}`;
      console.log("[no name's lyrics] fetching URL:", lrcUrl);

      try {
        // try fetching .lrc first
        const lrcRes = await fetch(lrcUrl);
        console.log("[no name's lyrics] fetch status:", lrcRes.status);

        if (lrcRes.ok) {
          const lrcText = await lrcRes.text();
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

        // fallback to json
        const jsonRes = await fetch(`${repoBase}/${jsonFilename}?t=${Date.now()}`);
        if (jsonRes.ok) {
          const data = await jsonRes.json();
          return {
            isError: false,
            result: {
              title: data.title || rawTitle,
              artist: data.artist || rawArtist,
              syncedType: data.syncedType || "LINE",
              syncedLyrics: data.syncedLyrics || data.lines,
              lines: data.lines || data.syncedLyrics,
              plainLyrics: data.plainLyrics,
              provider: "no name's lyrics"
            }
          };
        }

        console.warn("[no name's lyrics] no matching lyrics file found on github");
        return null;
      } catch (err) {
        console.error("[no name's lyrics] fetch error:", err);
        return null;
      }
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
