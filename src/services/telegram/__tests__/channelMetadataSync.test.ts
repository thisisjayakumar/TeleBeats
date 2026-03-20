import { Song } from "../../../types/song";
import { TelemetryClient } from "../../telemetry/telemetry";
import {
  syncTelegramChannelMetadata,
  type MetadataSyncRetryState,
} from "../channelMetadataSync";
import { TelegramChannelGateway, TelegramSession } from "../telegramClient";

type MockChannelGateway = jest.Mocked<TelegramChannelGateway>;

function createMockGateway(): MockChannelGateway {
  return {
    restoreSession: jest.fn(),
    fetchChannelAudioMetadata: jest.fn(),
    downloadAudioFromMessage: jest.fn(),
  };
}

function createSong(id: string, channelId: string): Song {
  return {
    id,
    title: `Title ${id}`,
    artist: "Artist",
    source: "telegram",
    channelId,
    channelTitle: channelId,
    messageId: 1,
  };
}

describe("syncTelegramChannelMetadata", () => {
  const session: TelegramSession = {
    sessionString: "session",
    phone: "+10000000000",
  };

  it("restores session and aggregates songs from all channels", async () => {
    const gateway = createMockGateway();
    gateway.restoreSession.mockResolvedValue(true);
    gateway.fetchChannelAudioMetadata
      .mockResolvedValueOnce([createSong("1", "chanA")])
      .mockResolvedValueOnce([createSong("2", "chanB")]);

    const songs = await syncTelegramChannelMetadata({
      session,
      channels: ["chanA", "chanB"],
      gateway,
    });

    expect(gateway.restoreSession).toHaveBeenCalledWith(session);
    expect(gateway.fetchChannelAudioMetadata).toHaveBeenNthCalledWith(1, {
      channel: "chanA",
      limit: 200,
    });
    expect(gateway.fetchChannelAudioMetadata).toHaveBeenNthCalledWith(2, {
      channel: "chanB",
      limit: 200,
    });
    expect(songs).toHaveLength(2);
  });

  it("retries retryable channel fetch errors and emits telemetry", async () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
    const gateway = createMockGateway();
    gateway.restoreSession.mockResolvedValue(true);
    gateway.fetchChannelAudioMetadata
      .mockRejectedValueOnce(new Error("temporary network issue"))
      .mockResolvedValue([createSong("1", "chanA")]);

    const telemetry: TelemetryClient = { track: jest.fn() };
    const onRetryState = jest.fn();

    const songs = await syncTelegramChannelMetadata({
      session,
      channels: ["chanA"],
      gateway,
      telemetry,
      maxAttempts: 2,
      baseDelayMs: 0,
      onRetryState,
    });

    expect(songs).toHaveLength(1);
    expect(gateway.fetchChannelAudioMetadata).toHaveBeenCalledTimes(2);
    expect(telemetry.track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "telegram_channel_metadata_retry",
      })
    );
    randomSpy.mockRestore();
  });

  it("fails immediately when restored session is unauthorized", async () => {
    const gateway = createMockGateway();
    gateway.restoreSession.mockResolvedValue(false);

    await expect(
      syncTelegramChannelMetadata({
        session,
        channels: ["chanA"],
        gateway,
      })
    ).rejects.toThrow("Telegram session is no longer authorized.");

    expect(gateway.fetchChannelAudioMetadata).not.toHaveBeenCalled();
  });
});
