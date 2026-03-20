import { Api, TelegramClient } from "telegram";
import { RPCError } from "telegram/errors";
import { StringSession } from "telegram/sessions";
import { Song } from "../../types/song";
import { TelegramTwoFactorRequiredError } from "./errors";

export type TelegramRuntimeConfig = {
  apiId: number;
  apiHash: string;
};

export type TelegramSession = {
  sessionString: string;
  phone: string;
};

export type RequestCodeInput = {
  phone: string;
};

export type RequestCodeOutput = {
  phone: string;
  phoneCodeHash: string;
};

export type VerifyCodeInput = {
  phone: string;
  code: string;
  phoneCodeHash: string;
};

export type VerifyCodeOutput = {
  sessionString: string;
  phone: string;
};

export type VerifyPasswordInput = {
  password: string;
};

export type VerifyPasswordOutput = {
  sessionString: string;
};

export type FetchChannelAudioMetadataInput = {
  channel: string;
  limit?: number;
};

export interface TelegramAuthGateway {
  restoreSession(session: TelegramSession): Promise<boolean>;
  requestCode(input: RequestCodeInput): Promise<RequestCodeOutput>;
  verifyCode(input: VerifyCodeInput): Promise<VerifyCodeOutput>;
  verifyPassword(input: VerifyPasswordInput): Promise<VerifyPasswordOutput>;
  signOut(): Promise<void>;
}

export interface TelegramChannelGateway {
  restoreSession(session: TelegramSession): Promise<boolean>;
  fetchChannelAudioMetadata(input: FetchChannelAudioMetadataInput): Promise<Song[]>;
  downloadAudioFromMessage(
    channelId: string,
    messageId: number,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<Uint8Array | null>;
}

export class GramjsTelegramAuthGateway
  implements TelegramAuthGateway, TelegramChannelGateway
{
  private client: TelegramClient | null = null;
  private currentPhone: string | null = null;

  constructor(private readonly config: TelegramRuntimeConfig) {}

  private async getOrCreateClient(sessionString = ""): Promise<TelegramClient> {
    if (this.client) {
      return this.client;
    }

    const client = new TelegramClient(
      new StringSession(sessionString),
      this.config.apiId,
      this.config.apiHash,
      { connectionRetries: 3, useWSS: true }
    );

    await client.connect();
    this.client = client;
    return client;
  }

  async restoreSession(session: TelegramSession): Promise<boolean> {
    if (this.client) {
      await this.client.disconnect();
    }
    this.client = null;
    const client = await this.getOrCreateClient(session.sessionString);
    return client.isUserAuthorized();
  }

  async requestCode(input: RequestCodeInput): Promise<RequestCodeOutput> {
    const client = await this.getOrCreateClient();
    const sentCode = await client.sendCode(
      { apiId: this.config.apiId, apiHash: this.config.apiHash },
      input.phone
    );
    this.currentPhone = input.phone;

    const phoneCodeHash = (sentCode as { phoneCodeHash?: string }).phoneCodeHash;
    if (!phoneCodeHash) {
      throw new Error("Telegram did not return a phone code hash.");
    }

    return {
      phone: input.phone,
      phoneCodeHash,
    };
  }

  async verifyCode(input: VerifyCodeInput): Promise<VerifyCodeOutput> {
    const client = await this.getOrCreateClient();
    this.currentPhone = input.phone;

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: input.phone,
          phoneCodeHash: input.phoneCodeHash,
          phoneCode: input.code,
        })
      );
    } catch (error) {
      if (
        error instanceof RPCError &&
        error.errorMessage === "SESSION_PASSWORD_NEEDED"
      ) {
        const passwordInfo = await client.invoke(new Api.account.GetPassword());
        throw new TelegramTwoFactorRequiredError(passwordInfo.hint);
      }
      throw error;
    }

    return {
      sessionString: client.session.save() as unknown as string,
      phone: input.phone,
    };
  }

  async verifyPassword(input: VerifyPasswordInput): Promise<VerifyPasswordOutput> {
    const client = await this.getOrCreateClient();
    try {
      await client.signInWithPassword(
        { apiId: this.config.apiId, apiHash: this.config.apiHash },
        {
          password: async () => input.password,
          onError: async (error) => {
            throw error;
          },
        }
      );
    } catch (error) {
      if (error instanceof RPCError && error.errorMessage === "PASSWORD_HASH_INVALID") {
        throw new Error("Invalid 2FA password. Please try again.");
      }
      throw error;
    }

    if (!this.currentPhone) {
      throw new Error("Cannot resolve current phone during password verification.");
    }

    return {
      sessionString: client.session.save() as unknown as string,
    };
  }

  async downloadAudioFromMessage(
    channelId: string,
    messageId: number,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<Uint8Array | null> {
    const client = await this.getOrCreateClient();
    const peer = await client.getEntity(channelId);

    // Fetch the specific message containing the audio file
    const result = await client.invoke(
      new Api.channels.GetMessages({
        channel: peer,
        id: [new Api.InputMessageID({ id: messageId })],
      })
    );

    const messages = (
      result as unknown as { messages?: Array<unknown> }
    ).messages;
    if (!messages?.length) return null;
    const message = messages[0];

    const buffer = await client.downloadMedia(
      message as Parameters<typeof client.downloadMedia>[0],
      {
        // GramJS progressCallback receives BigInt bytes
        progressCallback: onProgress
          ? (downloaded: unknown, total: unknown) =>
              onProgress(Number(downloaded), Number(total))
          : undefined,
      }
    );

    if (!buffer) return null;
    // GramJS returns Buffer (Node) or Uint8Array in RN
    if (buffer instanceof Uint8Array) return buffer;
    return new Uint8Array(buffer as unknown as ArrayBuffer);
  }

  async signOut(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.invoke(new Api.auth.LogOut());
    await this.client.disconnect();
    this.client = null;
  }

  async fetchChannelAudioMetadata(input: FetchChannelAudioMetadataInput): Promise<Song[]> {
    const client = await this.getOrCreateClient();
    const peer = await client.getEntity(input.channel);
    const history = await client.invoke(
      new Api.messages.GetHistory({
        peer,
        limit: input.limit ?? 200,
        offsetDate: 0,
        offsetId: 0,
        addOffset: 0,
        maxId: 0,
        minId: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hash: BigInt(0) as any,
      })
    );

    const messages = (
      history as unknown as {
        messages?: Array<Record<string, unknown>>;
      }
    ).messages;
    if (!messages || messages.length === 0) {
      return [];
    }

    const channelTitle =
      (peer as { title?: string; username?: string }).title ??
      (peer as { title?: string; username?: string }).username ??
      input.channel;

    const songs: Song[] = [];
    for (const message of messages) {
      const parsedSong = parseSongFromTelegramMessage({
        message,
        channelId: input.channel,
        channelTitle,
      });
      if (parsedSong) {
        songs.push(parsedSong);
      }
    }

    return songs;
  }
}

export function createTelegramAuthGateway(
  config: TelegramRuntimeConfig
): TelegramAuthGateway {
  return new GramjsTelegramAuthGateway(config);
}

export function createTelegramChannelGateway(
  config: TelegramRuntimeConfig
): TelegramChannelGateway {
  return new GramjsTelegramAuthGateway(config);
}

function parseSongFromTelegramMessage(input: {
  message: Record<string, unknown>;
  channelId: string;
  channelTitle: string;
}): Song | null {
  const media = input.message.media as { document?: Record<string, unknown> } | undefined;
  const document = media?.document;
  if (!document) {
    return null;
  }

  const documentId = document.id;
  const messageId = input.message.id;
  if (typeof documentId !== "bigint" || typeof messageId !== "number") {
    return null;
  }

  const attributes = Array.isArray(document.attributes)
    ? (document.attributes as Array<Record<string, unknown>>)
    : [];
  const audioAttribute = attributes.find((attribute) =>
    isTelegramClass(attribute, "DocumentAttributeAudio")
  );
  if (!audioAttribute) {
    return null;
  }

  const filenameAttribute = attributes.find((attribute) =>
    isTelegramClass(attribute, "DocumentAttributeFilename")
  );

  const durationSec =
    typeof audioAttribute.duration === "number" ? audioAttribute.duration : undefined;
  const title =
    typeof audioAttribute.title === "string" && audioAttribute.title.length > 0
      ? audioAttribute.title
      : typeof input.message.message === "string" && input.message.message.length > 0
        ? input.message.message
        : "Unknown title";
  const artist =
    typeof audioAttribute.performer === "string" && audioAttribute.performer.length > 0
      ? audioAttribute.performer
      : "Unknown artist";
  const fileName =
    filenameAttribute && typeof filenameAttribute.fileName === "string"
      ? filenameAttribute.fileName
      : undefined;
  const mimeType = typeof document.mimeType === "string" ? document.mimeType : undefined;
  const fileSizeBytes = typeof document.size === "bigint" ? Number(document.size) : undefined;

  return {
    id: documentId.toString(),
    title,
    artist,
    durationSec,
    source: "telegram",
    channelId: input.channelId,
    channelTitle: input.channelTitle,
    messageId,
    fileName,
    mimeType,
    fileSizeBytes,
  };
}

function isTelegramClass(
  value: Record<string, unknown> | undefined,
  className: string
): boolean {
  return value?.className === className;
}
