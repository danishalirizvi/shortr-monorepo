'use client';

import { useState, useTransition } from 'react';
import { Link2, Loader2, Copy, Check } from 'lucide-react';
import { shortenUrl, ShortenResponse, InvalidUrlError, RateLimitError } from '@/lib/api';

export default function UrlShortener() {
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setError(null);

    let parsed: URL;
    try {
      parsed = new URL(input.trim());
    } catch {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    startTransition(async () => {
      try {
        const data = await shortenUrl(input.trim());
        setResult(data);
      } catch (err) {
        if (err instanceof RateLimitError) {
          setError("You've reached the limit (3 per hour). Please try again later.");
        } else if (err instanceof InvalidUrlError) {
          setError(err.message);
        } else {
          setError('Something went wrong. Please try again.');
        }
      }
    });
  }

  function fallbackCopy(text: string) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopy() {
    const url = result!.shortUrl;

    if (!navigator.clipboard) {
      fallbackCopy(url);
      return;
    }

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      fallbackCopy(url);
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} noValidate className="flex gap-2">
        <input
          type="url"
          autoComplete="url"
          aria-label="Long URL to shorten"
          placeholder="https://example.com/very/long/url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          required
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:opacity-50 placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={isPending || input.trim() === ''}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Shortening&hellip;
            </>
          ) : (
            <>
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Shorten
            </>
          )}
        </button>
      </form>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {result && !error && (
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Your short link</p>
            <div className="flex items-center gap-2">
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm font-medium text-zinc-950 hover:underline truncate"
              >
                {result.shortUrl}
              </a>
              <button
                onClick={handleCopy}
                aria-label={copied ? 'Link copied' : 'Copy short link'}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-600" aria-hidden="true" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" /> Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-zinc-400 truncate">{result.longURL}</p>
          </div>
        )}
      </div>
    </div>
  );
}
