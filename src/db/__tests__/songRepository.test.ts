import { Song } from "../../types/song";
import { getSongRepository } from "../songRepository";

function createSong(id: string, channelId: string): Song {
  return {
    id,
    title: `Song ${id}`,
    artist: "Artist",
    source: "telegram",
    channelId,
    channelTitle: channelId,
    messageId: Number(id),
  };
}

describe("songRepository", () => {
  it("seeds and queries songs by channel", async () => {
    const repository = getSongRepository();
    await repository.seedFromTelegramSongs([
      createSong("101", "chanA"),
      createSong("102", "chanB"),
      createSong("103", "chanA"),
    ]);

    const chanASongs = await repository.getSongsByChannel("chanA");

    expect(chanASongs).toHaveLength(2);
    expect(chanASongs.every((song) => song.channelId === "chanA")).toBe(true);
  });
});
