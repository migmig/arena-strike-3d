export interface LoadRetryOptions {
  retries?: number;
  baseDelayMs?: number;
  onAttempt?: (attempt: number, error: unknown) => void;
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: LoadRetryOptions = {},
): Promise<Response> {
  const retries = opts.retries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 250;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (e) {
      lastErr = e;
      opts.onAttempt?.(attempt, e);
      if (attempt === retries) break;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr ?? new Error(`Failed to load ${url}`);
}

export async function loadJsonWithRetry<T>(url: string, opts?: LoadRetryOptions): Promise<T> {
  const res = await fetchWithRetry(url, undefined, opts);
  return (await res.json()) as T;
}

export async function loadImageWithRetry(
  url: string,
  opts: LoadRetryOptions = {},
): Promise<HTMLImageElement> {
  const retries = opts.retries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 250;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
      });
    } catch (e) {
      lastErr = e;
      opts.onAttempt?.(attempt, e);
      if (attempt === retries) break;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr ?? new Error(`Failed to load image ${url}`);
}
