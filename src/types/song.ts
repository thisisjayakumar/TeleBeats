export type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSec?: number;
  source: "telegram";
  channelId: string;
  channelTitle: string;
  messageId: number;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
};
