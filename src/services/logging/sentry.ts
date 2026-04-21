import * as Sentry from '@sentry/react-native';
import { addLogListener, type LogEntry } from './logger';
import { getSentryEnvConfig } from '../../config/env';

export function initSentry(): void {
  const config = getSentryEnvConfig();
  
  if (!config.dsn) {
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });
}

export function setupSentryLogging(): () => void {
  return addLogListener((entry: LogEntry) => {
    if (entry.level === 'error' && entry.error) {
      Sentry.captureException(entry.error, {
        extra: {
          category: entry.category,
          message: entry.message,
          data: entry.data,
        },
      });
    } else if (entry.level === 'error') {
      Sentry.captureMessage(entry.message, {
        level: 'error',
        extra: {
          category: entry.category,
          data: entry.data,
        },
      });
    }
  });
}

export { Sentry };