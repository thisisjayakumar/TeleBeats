export type TelemetryEvent = {
  name: string;
  attributes?: Record<string, string | number | boolean>;
};

export interface TelemetryClient {
  track(event: TelemetryEvent): void;
}

class ConsoleTelemetryClient implements TelemetryClient {
  track(event: TelemetryEvent): void {
    if (!__DEV__) {
      return;
    }

    // Development-only telemetry sink; replace with remote provider later.
    console.info("[telemetry]", event.name, event.attributes ?? {});
  }
}

const defaultTelemetryClient = new ConsoleTelemetryClient();

export function getTelemetryClient(): TelemetryClient {
  return defaultTelemetryClient;
}
