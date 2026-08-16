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
  // normalize text for filenames: lowercases, replaces spaces/special chars with underscores
  function slugify(str) {
    return (str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  // helper to parse LRC format timestamp [mm:ss.xx] into milliseconds
  function parseLrc(lrcText) {
    const lines = lrcText.split("\n");
    const syncedLyrics = [];
    const plainLyricsArr = [];

    // regex to capture [mm:ss.xx] or [mm:ss:xx] and lyric text
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
          text: text
        });
        plainLyricsArr.push(text);
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
    cacheVersion: 1,

    init() {
      console.log("[no name's lyrics] initialized");
    },

    getSettingsUI() {
      return null;
    },

    async getLyrics(info) {
      if (!info || !info.title) return null;

      const repoBase = "https://raw.githubusercontent.com/blasieuwu/no-names-lyrics/main/lyrics";
      
      const titleSlug = slugify(info.title);
      const artistSlug = slugify(info.artist);

      // creates filenames like "too_little_too_late-laufey.lrc"
      const lrcFilename = `${titleSlug}-${artistSlug}.lrc`;
      const jsonFilename = `${titleSlug}-${artistSlug}.json`;

      try {
        // try fetching .lrc first
        const lrcRes = await fetch(`${repoBase}/${lrcFilename}`);
        if (lrcRes.ok) {
          const lrcText = await lrcRes.text();
          const parsed = parseLrc(lrcText);

          return {
            isError: false,
            result: {
              title: info.title,
              artist: info.artist,
              syncedType: "line",
              syncedLyrics: parsed.syncedLyrics,
              plainLyrics: parsed.plainLyrics,
              provider: "no name's lyrics"
            }
          };
        }

        // fallback to .json if .lrc isn't found
        const jsonRes = await fetch(`${repoBase}/${jsonFilename}`);
        if (jsonRes.ok) {
          const data = await jsonRes.json();
          return {
            isError: false,
            result: {
              title: data.title || info.title,
              artist: data.artist || info.artist,
              syncedType: data.syncedType || "line",
              syncedLyrics: data.syncedLyrics,
              plainLyrics: data.plainLyrics,
              provider: "no name's lyrics"
            }
          };
        }

        return null;
      } catch (err) {
        console.error("[no name's lyrics] fetch error:", err);
        return null;
      }
    }
  };

  // safely register with LyricsAddonManager
  function register() {
    if (window.LyricsAddonManager && typeof window.LyricsAddonManager.register === "function") {
      window.LyricsAddonManager.register(NoNamesLyricsAddon);
    } else {
      setTimeout(register, 100);
    }
  }

  register();
})();
