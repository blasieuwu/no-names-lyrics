module.exports = {
  async getLyrics(info) {
    // info contains track details from Spotify: title, artist, album, duration
    const title = info.title.toLowerCase();
    const artist = info.artist.toLowerCase();

    // construct raw github URL for your JSON files
    const repoBase = "https://raw.githubusercontent.com/blasieuwu/no-names-lyrics/main/lyrics";
    
    // simple slug matching (e.g., "too-little-too-late.json")
    const filename = title.replace(/[^a-z0-0]/g, "-") + ".json";

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
