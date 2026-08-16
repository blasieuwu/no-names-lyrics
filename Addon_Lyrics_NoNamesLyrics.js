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
  // clean slugification: removes punctuation cleanly first
  function slugify(str) {
    return (str || "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // remove punctuation like commas
      .trim()
      .replace(/[\s_]+/g, "_"); // replace spaces with single underscore
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
      if (!info || !info.title) return null;

      const repoBase = "https://raw.githubusercontent.com/blasieuwu/no-names-lyrics/main/lyrics";
      
      const titleSlug = slugify(info.title);
      const artistSlug = slugify(info.artist);

      const lrcFilename = `${titleSlug}-${artistSlug}.lrc`;
      const lrcUrl = `${repoBase}/${lrcFilename}?t=${Date.now()}`; // bypass raw github cache

      console.log("[no name's lyrics] fetching:", lrcUrl);

      try {
        const lrcRes = await fetch(lrcUrl);
        if (lrcRes.ok) {
          const lrcText = await lrcRes.text();
          const parsed = parseLrc(lrcText);

          console.log("[no name's lyrics] successfully loaded parsed lyrics:", parsed);

          return {
            isError: false,
            result: {
              title: info.title,
              artist: info.artist,
              syncedType: "line",
              syncedLyrics: parsed.syncedLyrics,
              lines: parsed.syncedLyrics, // redundant mapping for ivlyrics schema compatibility
              plainLyrics: parsed.plainLyrics,
              provider: "no name's lyrics"
            }
          };
        } else {
          console.warn("[no name's lyrics] file not found (404):", lrcFilename);
        }

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
