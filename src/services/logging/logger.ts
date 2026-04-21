export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
}

export interface NetworkLogEntry extends LogEntry {
  category: 'network';
  method: string;
  url: string;
  statusCode?: number;
  durationMs?: number;
  requestBody?: unknown;
  responseBody?: unknown;
}

type LogListener = (entry: LogEntry) => void;

const listeners = new Set<LogListener>();
const networkLogs: NetworkLogEntry[] = [];
const MAX_NETWORK_LOGS = 100;

export function addLogListener(listener: LogListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(entry: LogEntry): void {
  listeners.forEach((listener) => {
    try {
      listener(entry);
    } catch {
    }
  });

  if (entry.category === 'network') {
    networkLogs.push(entry as NetworkLogEntry);
    if (networkLogs.length > MAX_NETWORK_LOGS) {
      networkLogs.shift();
    }
  }

  const prefix = `[${entry.level.toUpperCase()}] [${entry.category}]`;
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  const errorStr = entry.error ? ` ${entry.error.message}` : '';

  switch (entry.level) {
    case 'debug':
      console.debug(prefix, entry.message, dataStr);
      break;
    case 'info':
      console.info(prefix, entry.message, dataStr);
      break;
    case 'warn':
      console.warn(prefix, entry.message, dataStr, errorStr);
      break;
    case 'error':
      console.error(prefix, entry.message, dataStr, errorStr);
      break;
  }
}

export const logger = {
  debug(category: string, message: string, data?: Record<string, unknown>): void {
    emit({ timestamp: Date.now(), level: 'debug', category, message, data });
  },

  info(category: string, message: string, data?: Record<string, unknown>): void {
    emit({ timestamp: Date.now(), level: 'info', category, message, data });
  },

  warn(category: string, message: string, data?: Record<string, unknown>): void {
    emit({ timestamp: Date.now(), level: 'warn', category, message, data });
  },

  error(category: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    emit({ timestamp: Date.now(), level: 'error', category, message, error, data });
  },

  getNetworkLogs(): NetworkLogEntry[] {
    return [...networkLogs];
  },

  clearNetworkLogs(): void {
    networkLogs.length = 0;
  },
};

export const networkLogger = {
  logRequest(
    method: string,
    url: string,
    requestBody?: unknown
  ): (statusCode: number, responseBody?: unknown) => void {
    const startTime = Date.now();

    return (statusCode: number, responseBody?: unknown) => {
      const durationMs = Date.now() - startTime;
      const level = statusCode >= 400 || statusCode >= 500 ? 'error' : 'info';

      emit({
        timestamp: Date.now(),
        level,
        category: 'network',
        message: `${method} ${url} - ${statusCode}`,
        data: { durationMs, statusCode },
        error: statusCode >= 500 ? new Error(`Server error: ${statusCode}`) : undefined,
      } as NetworkLogEntry);
    };
  },

  logError(method: string, url: string, error: Error): void {
    emit({
      timestamp: Date.now(),
      level: 'error',
      category: 'network',
      message: `${method} ${url} - Failed`,
      error,
      data: { method, url },
    } as NetworkLogEntry);
  },
};