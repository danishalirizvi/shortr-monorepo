export type ShortenResponse = {
  shortUrl: string;
  shortCode: string;
  longURL: string;
};

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

export class RateLimitError extends Error {
  retryAfterSeconds: number | null;

  constructor(message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ApiError extends Error {
  statusCode: number | null;

  constructor(message: string, statusCode: number | null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function shortenUrl(longURL: string): Promise<ShortenResponse> {
  let response: Response;
  try {
    response = await fetch('/api/v1/public-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longURL }),
    });
  } catch {
    throw new ApiError('Network error. Please check your connection.', null);
  }

  if (response.ok) {
    let json: { success: boolean; data: ShortenResponse };
    try {
      json = (await response.json()) as { success: boolean; data: ShortenResponse };
    } catch {
      throw new ApiError('Unexpected response format from server', response.status);
    }
    return json.data;
  }

  let body: { success: boolean; error?: { code?: string; message?: string } } = {
    success: false,
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // ignore parse errors — fall through to defaults
  }

  const errorMessage = body.error?.message;

  if (response.status === 400) {
    throw new InvalidUrlError(errorMessage ?? 'Invalid URL');
  }

  if (response.status === 429) {
    let retryAfterSeconds: number | null = null;
    const resetHeader = response.headers.get('RateLimit-Reset');
    if (resetHeader !== null) {
      const seconds = Math.ceil(Number(resetHeader) - Date.now() / 1000);
      retryAfterSeconds = seconds > 0 ? seconds : null;
    }
    throw new RateLimitError(
      errorMessage ??
        "You've reached the limit for public link creation. Please try again in an hour.",
      retryAfterSeconds,
    );
  }

  throw new ApiError(errorMessage ?? 'Something went wrong', response.status);
}
