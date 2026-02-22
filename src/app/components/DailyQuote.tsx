import React from 'react';
import { useQuotes } from '../quote/QuoteContext';
import { Shuffle, Calendar, Copy, Twitter } from 'lucide-react';

export const DailyQuote: React.FC = () => {
  const { current, randomize, refreshDaily } = useQuotes();

  if (!current) return <div className="text-center py-6">Loading quote…</div>;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`"${current.text}" — ${current.author || ''}`);
    } catch {}
  };

  return (
    <div className="text-center space-y-4">
      <p className="text-2xl md:text-3xl text-gray-700 italic leading-relaxed">&ldquo;{current.text}&rdquo;</p>
      <p className="text-lg text-pink-500">— {current.author}</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <div className="flex w-full sm:w-auto gap-3">
          <button
            onClick={randomize}
            aria-label="Random quote"
            className="inline-flex flex-1 sm:w-auto items-center justify-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow hover:scale-105 transition-transform"
          >
            <Shuffle className="w-4 h-4" />
            <span className="text-sm font-medium">Random</span>
          </button>

          <button
            onClick={refreshDaily}
            aria-label="Daily quote"
            className="inline-flex flex-1 sm:w-auto items-center justify-center gap-2 px-3 py-2 rounded-full border border-pink-200 bg-white text-pink-600 shadow-sm hover:bg-pink-50 transition"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Daily</span>
          </button>
        </div>

        <div className="flex w-full sm:w-auto gap-3">
          <button
            onClick={copyToClipboard}
            aria-label="Copy quote"
            className="inline-flex flex-1 sm:w-auto items-center justify-center gap-2 px-3 py-2 rounded-full border border-pink-200 bg-white text-black shadow-sm hover:bg-pink-50 transition"
          >
            <Copy className="w-4 h-4" />
            <span className="text-sm">Copy</span>
          </button>

          <a
            className="inline-flex flex-1 sm:w-auto items-center justify-center gap-2 px-3 py-2 rounded-full bg-blue-500 text-white hover:brightness-105 transition"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`"${current.text}" — ${current.author || ''}`)}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Tweet quote"
          >
            <Twitter className="w-4 h-4" />
            <span className="text-sm">Tweet</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DailyQuote;
