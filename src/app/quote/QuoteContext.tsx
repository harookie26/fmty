import React, { createContext, useContext, useEffect, useState } from 'react';

type Quote = { text: string; author?: string };

type QuoteContextValue = {
  quotes: Quote[];
  current: Quote | null;
  randomize: () => void;
  refreshDaily: () => void;
};

const QuoteContext = createContext<QuoteContextValue | undefined>(undefined);

export const QuoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [current, setCurrent] = useState<Quote | null>(null);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [localQuotes, setLocalQuotes] = useState<Quote[]>([]);

  // Load local quotes pool and refresh daily quote (with caching)
  const fetchQuotes = async () => {
    // 1) Load local quotes.json into pool used for randomization
    try {
      const res = await fetch('/src/app/quotes.json');
      const data = await res.json();
      const local = Array.isArray(data) ? data.map((d: any) => ({ text: d.text, author: d.author })) : [];
      setLocalQuotes(local);
      setQuotes(local);
    } catch (e) {
      console.warn('[QuoteProvider] failed to load local quotes.json', e);
      setLocalQuotes([]);
      setQuotes([]);
    }

    // 2) Fetch and cache the daily quote from API Ninjas (one per day)
    await fetchDailyQuote();
  };

  // Fetch daily quote and cache it per-day in localStorage to avoid repeated API calls
  const fetchDailyQuote = async () => {
    const envKey = import.meta.env.VITE_QUOTES_API_KEY;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('quotesApiKey') : null;
    const key = storedKey || envKey;
    const api = 'https://api.api-ninjas.com/v2/quoteoftheday';
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `dailyQuote:${today}`;

    // Try cache first
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        const parsed = JSON.parse(cached) as Quote;
        const text = parsed && typeof parsed.text === 'string' ? parsed.text.trim() : '';
        if (text) {
          console.debug('[QuoteProvider] using cached daily quote for', today, parsed);
          setDailyQuote(parsed);
          setCurrent(parsed);
          return;
        }
        // cached entry invalid/empty -> remove and continue to re-fetch/fallback
        try { if (typeof window !== 'undefined') localStorage.removeItem(cacheKey); } catch {}
        console.debug('[QuoteProvider] removed invalid cached daily quote for', today);
      }
    } catch (e) {
      console.debug('[QuoteProvider] failed to parse cached daily quote for', today, e);
    }

    // If no API key, skip remote call
    if (!key) {
      console.debug('[QuoteProvider] no API key present; using deterministic local daily quote');
      // fallback: pick deterministic local daily quote
      if (localQuotes.length) {
        const idx = stableIndexFromString(today, localQuotes.length);
        setDailyQuote(localQuotes[idx]);
        setCurrent(localQuotes[idx]);
      }
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['X-Api-Key'] = key;

      console.debug('[QuoteProvider] fetching daily quote from API Ninjas', api, 'keyPresent=', !!key);
      const res = await fetch(api, { method: 'GET', headers });
      if (!res.ok) {
        console.warn('[QuoteProvider] daily quote fetch failed', res.status, res.statusText);
        // fallback to local deterministic quote
        if (localQuotes.length) {
          const idx = stableIndexFromString(today, localQuotes.length);
          setDailyQuote(localQuotes[idx]);
          setCurrent(localQuotes[idx]);
        }
        return;
      }

      const data = await res.json();
      console.debug('[QuoteProvider] daily quote response', data);
      // API Ninjas may return an array ([{ quote, author }]) or an object
      const payload = Array.isArray(data) && data.length ? data[0] : data;
      const maybeText = (payload && (payload.quote || payload.quote_of_the_day || payload.content || payload.en || payload.text)) || '';
      const text = typeof maybeText === 'string' ? maybeText.trim() : '';
      const author = payload && (payload.author || payload.writer) ? (payload.author || payload.writer) : undefined;

      if (!text) {
        console.warn('[QuoteProvider] daily quote response missing text, falling back to local');
        if (localQuotes.length) {
          const idx = stableIndexFromString(today, localQuotes.length);
          setDailyQuote(localQuotes[idx]);
          setCurrent(localQuotes[idx]);
        }
        return;
      }

      const q: Quote = { text, author };
      setDailyQuote(q);
      setCurrent(q);

      // cache it for today
      try { if (typeof window !== 'undefined') localStorage.setItem(cacheKey, JSON.stringify(q)); console.debug('[QuoteProvider] cached daily quote for', today); } catch (e) { console.debug('[QuoteProvider] failed to cache daily quote', e); }
    } catch (e) {
      console.error('[QuoteProvider] fetchDailyQuote failed', e);
      if (localQuotes.length) {
        const idx = stableIndexFromString(today, localQuotes.length);
        setDailyQuote(localQuotes[idx]);
        setCurrent(localQuotes[idx]);
      }
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    // If we have a daily quote from remote, prefer it. Otherwise pick today's quote
    if (dailyQuote) {
      setCurrent(dailyQuote);
      return;
    }
    if (!quotes.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const idx = stableIndexFromString(today, quotes.length);
    setCurrent(quotes[idx]);
  }, [quotes, dailyQuote]);

  const randomize = () => {
    // Only use local quotes.json as the source for random quotes
    if (!localQuotes.length) return;
    const idx = Math.floor(Math.random() * localQuotes.length);
    setCurrent(localQuotes[idx]);
    try { localStorage.setItem('lastRandom', Date.now().toString()); } catch {}
  };

  const refreshDaily = () => {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `dailyQuote:${today}`;

    // If we already have the dailyQuote in memory, use it
    if (dailyQuote) {
      setCurrent(dailyQuote);
      return;
    }

    // Check per-day cache first to avoid unnecessary API calls
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        const parsed = JSON.parse(cached) as Quote;
        const text = parsed && typeof parsed.text === 'string' ? parsed.text.trim() : '';
        if (text) {
          setDailyQuote(parsed);
          setCurrent(parsed);
          console.debug('[QuoteProvider] refreshDaily used cached quote for', today);
          return;
        }
        try { if (typeof window !== 'undefined') localStorage.removeItem(cacheKey); } catch {}
      }
    } catch (e) {
      // ignore
    }

    // No cached daily quote — fall back to fetching (which will cache it)
    const storedApi = typeof window !== 'undefined' ? localStorage.getItem('quotesApi') : null;
    const envApi = import.meta.env.VITE_QUOTES_API;
    const defaultApi = 'https://api.api-ninjas.com/v2/quoteoftheday';
    const api = storedApi || envApi || defaultApi;
    if (api && api.includes('api-ninjas.com')) {
      fetchQuotes();
      return;
    }

    // If no API configured, use deterministic local daily quote
    if (!localQuotes.length) return;
    const idx = stableIndexFromString(today, localQuotes.length);
    setCurrent(localQuotes[idx]);
  };

  return (
    <QuoteContext.Provider value={{ quotes, current, randomize, refreshDaily }}>
      {children}
    </QuoteContext.Provider>
  );
};

// Helper to set the remote API at runtime (persists in localStorage)
export function setQuotesApi(url: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (url) localStorage.setItem('quotesApi', url);
    else localStorage.removeItem('quotesApi');
    // trigger a reload so the provider picks up new API next mount
    window.location.reload();
  } catch (e) {
    console.error('setQuotesApi failed', e);
  }
}

function stableIndexFromString(s: string, n: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % n;
}

export const useQuotes = () => {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error('useQuotes must be used within QuoteProvider');
  return ctx;
};

export default QuoteContext;
