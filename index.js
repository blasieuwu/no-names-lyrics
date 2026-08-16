/**
 * @addon-type lyrics
 * @name no name's lyrics
 * @description someone's attempt at lyric syncronization
 * @version 1.0.0
 * @author blasieuwu
 * @supports karaoke: false
 * @supports synced: true
 * @supports unsynced: true
 */

module.exports = {
  async getLyrics(info) {
    const title = info.title.toLowerCase();
    const repoBase = "https://raw.githubusercontent.com/blasieuwu/no-names-lyrics/main/lyrics";
    
    // matches filenames like "too-little--too-late.json"
    const filename = title.replace(/[^a-z0-9]/g, "-") + ".json";

    try {
      const response = await fetch(`${repoBase}/${filename}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        isError: false,
        result: {
          title: data.title,
          artist: data.artist,
          syncedType: data.syncedType || "line",
          syncedLyrics: data.syncedLyrics,
          plainLyrics: data.plainLyrics,
          provider: "no name's lyrics"
        }
      };
    } catch (err) {
      return null;
    }
  }
};
