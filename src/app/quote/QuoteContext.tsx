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
  // Meta about quotes to avoid repeats and bias older quotes
  type QuoteMeta = { lastShownAt?: number; count?: number };
  const META_KEY = 'quoteMeta:v1';
  const [metaMap, setMetaMap] = useState<Record<string, QuoteMeta>>({});

  // Load local quotes pool and refresh daily quote (with caching)
  const fetchQuotes = async () => {
    // 1) Load local quotes.json into pool used for randomization
    let local: Quote[] = [];
    try {
      const res = await fetch(new URL('../quotes.json', import.meta.url).href);
      const data = await res.json();
      local = Array.isArray(data) ? data.map((d: any) => ({ text: d.text, author: d.author })) : [];
      setLocalQuotes(local);
      setQuotes(local);
      // hydrate meta map from storage (synchronous-ish)
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(META_KEY);
          const parsed = raw ? JSON.parse(raw) : {};
          // ensure an entry exists for each quote text
          const next: Record<string, QuoteMeta> = { ...(parsed || {}) };
          for (const q of local) {
            if (!next[q.text]) next[q.text] = { lastShownAt: 0, count: 0 };
          }
          setMetaMap(next);
        }
      } catch (e) {
        console.debug('[QuoteProvider] failed to hydrate meta', e);
      }
    } catch (e) {
      console.warn('[QuoteProvider] failed to load local quotes.json', e);
      local = [];
      setLocalQuotes([]);
      setQuotes([]);
    }

    // 2) Fetch and cache the daily quote from API Ninjas (one per day)
    // pass the freshly loaded local pool to avoid relying on async state update
    await fetchDailyQuote(local);
  };

  function persistMeta(m: Record<string, QuoteMeta>) {
    try { if (typeof window !== 'undefined') localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) { console.debug('[QuoteProvider] persistMeta failed', e); }
  }

  function updateMetaForQuote(q: Quote) {
    if (!q || !q.text) return;
    setMetaMap(prev => {
      const next = { ...(prev || {}) };
      const cur = next[q.text] || { lastShownAt: 0, count: 0 };
      cur.lastShownAt = Date.now();
      cur.count = (cur.count || 0) + 1;
      next[q.text] = cur;
      persistMeta(next);
      return next;
    });
  }

  function pickWeightedRandomIndexFromCandidates(candidates: number[], now: number) {
    const weights = candidates.map(i => {
      const q = localQuotes[i];
      const m = metaMap[q?.text] || { lastShownAt: 0 };
      const ageSeconds = (now - (m.lastShownAt || 0)) / 1000;
      // older -> higher weight; ensure minimum 1
      return Math.max(1, ageSeconds || 1);
    });
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      if (r < weights[i]) return candidates[i];
      r -= weights[i];
    }
    return candidates[candidates.length - 1];
  }

  // Fetch daily quote and cache it per-day in localStorage to avoid repeated API calls
  const fetchDailyQuote = async (localPool?: Quote[]) => {
    const envKey = import.meta.env.VITE_QUOTES_API_KEY;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('quotesApiKey') : null;
    const key = storedKey || envKey;
    const local = Array.isArray(localPool) ? localPool : localQuotes;
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
      if (local && local.length) {
        const idx = stableIndexFromString(today, local.length);
        setDailyQuote(local[idx]);
        setCurrent(local[idx]);
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
        if (local && local.length) {
          const idx = stableIndexFromString(today, local.length);
          setDailyQuote(local[idx]);
          setCurrent(local[idx]);
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
        if (local && local.length) {
          const idx = stableIndexFromString(today, local.length);
          setDailyQuote(local[idx]);
          setCurrent(local[idx]);
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
      if (local && local.length) {
        const idx = stableIndexFromString(today, local.length);
        setDailyQuote(local[idx]);
        setCurrent(local[idx]);
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
      // record meta for daily quote if it originates from local pool
      try { updateMetaForQuote(dailyQuote); } catch {}
      return;
    }
    if (!quotes.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const idx = stableIndexFromString(today, quotes.length);
    setCurrent(quotes[idx]);
    try { updateMetaForQuote(quotes[idx]); } catch {}
  }, [quotes, dailyQuote]);

  const randomize = () => {
    if (!localQuotes.length) return;
    const now = Date.now();

    // avoid immediate repeat
    const lastText = current?.text;
    // compute recent history size
    const historySize = Math.max(3, Math.floor(localQuotes.length / 3));
    // build recent list by lastShownAt
    const entries = localQuotes.map((q, i) => ({ i, last: (metaMap[q.text]?.lastShownAt || 0) }));
    entries.sort((a, b) => b.last - a.last);
    const recent = new Set(entries.slice(0, historySize).map(e => e.i));

    // build candidates excluding immediate repeat and recent history
    let candidates = [] as number[];
    for (let i = 0; i < localQuotes.length; i++) {
      if (localQuotes[i].text === lastText) continue;
      if (recent.has(i)) continue;
      candidates.push(i);
    }

    // if no candidates, relax recent-history exclusion but still avoid immediate repeat
    if (candidates.length === 0) {
      for (let i = 0; i < localQuotes.length; i++) {
        if (localQuotes[i].text === lastText) continue;
        candidates.push(i);
      }
    }

    const pickIdx = pickWeightedRandomIndexFromCandidates(candidates, now);
    const picked = localQuotes[pickIdx];
    if (picked) {
      setCurrent(picked);
      updateMetaForQuote(picked);
      try { localStorage.setItem('lastRandom', Date.now().toString()); } catch {}
    }
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
