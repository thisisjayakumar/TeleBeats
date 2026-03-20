type RetryContext = {
  attempt: number;
  maxAttempts: number;
  nextDelayMs: number;
  error: unknown;
};

type RetryOptions<T> = {
  task: () => Promise<T>;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (ctx: RetryContext) => void;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay(baseMs: number, maxDelayMs: number, attempt: number): number {
  const exponential = Math.min(baseMs * 2 ** (attempt - 1), maxDelayMs);
  const jitter = Math.floor(Math.random() * 200);
  return exponential + jitter;
}

export async function retryWithBackoff<T>({
  task,
  maxAttempts = 3,
  baseDelayMs = 500,
  maxDelayMs = 4_000,
  shouldRetry,
  onRetry,
}: RetryOptions<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      if (shouldRetry && !shouldRetry(error, attempt)) {
        break;
      }

      const nextDelayMs = jitteredDelay(baseDelayMs, maxDelayMs, attempt);
      onRetry?.({ attempt, maxAttempts, nextDelayMs, error });
      await delay(nextDelayMs);
    }
  }

  throw lastError;
}
