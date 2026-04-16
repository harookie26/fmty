# from me to you

A beautiful, responsive daily quote app with a floral aesthetic. Displays curated quotes with intelligent randomization, copy-to-clipboard functionality, and sharing.

---

## Quick Start

```bash
npm i          # Install dependencies
npm run dev    # Start dev server (http://localhost:5173)
npm run build  # Production build
```

---

## Features

- **Daily Quote Display** — Shows a curated quote each day, persisted in localStorage to keep consistency
- **Smart Random Shuffle** — Weighted randomization algorithm that avoids recently shown quotes and tracks display frequency
- **Copy to Clipboard** — One-click quote copying with visual feedback
- **Twitter Share** — Share quotes directly to Twitter with pre-filled text
- **Responsive Design** — Fluid layouts using `clamp()` CSS functions; works flawlessly from mobile to desktop
- **Image Fallbacks** — Graceful degradation for missing Unsplash images; never breaks the UI
- **Decorative Elements** — Floral swirls and corner graphics that scale intelligently with the viewport

---

## Tech Stack

| Category          | Technology             | Version                |
| ----------------- | ---------------------- | ---------------------- |
| **Framework**     | React + TypeScript     | 18.3.1                 |
| **Build Tool**    | Vite                   | 6.3.5                  |
| **Styling**       | Tailwind CSS + Emotion | 4.1.12, 11.14.0        |
| **UI Primitives** | Radix UI               | Various (1.x–2.x)      |
| **Icons**         | lucide-react           | 0.487.0                |
| **Utilities**     | date-fns, motion, cmdk | 3.6.0, 12.23.24, 1.1.1 |
| **Analytics**     | Vercel Analytics       | ^1.6.1                 |

**Why these choices?**

- **Radix UI** provides accessible, unstyled primitives perfect for custom design systems
- **Emotion** enables scoped CSS-in-JS alongside Tailwind for maximum styling flexibility
- **Vite** delivers blazing-fast dev experience with instant HMR
- **Tailwind + motion** combines utility-first CSS with smooth animations for delightful interactions

---

## Project Architecture

### Folder Structure

```
src/
├── app/
│   ├── App.tsx              # Main layout component; renders decorative elements, gradient bg, main card
│   ├── quotes.json          # Local quote database (fallback + primary source)
│   ├── components/
│   │   ├── DailyQuote.tsx   # Core quote card component; displays text, author, action buttons
│   │   ├── figma/
│   │   │   └── ImageWithFallback.tsx  # Image wrapper with graceful fallback handling
│   │   └── ui/              # 40+ Radix UI + MUI components (buttons, dialogs, etc.)
│   └── quote/
│       └── QuoteContext.tsx # React Context managing quote state, caching, and randomization
├── styles/
│   ├── tailwind.css         # Tailwind directives
│   ├── theme.css            # Custom CSS variables for gradients, spacing
│   ├── fonts.css            # Font imports (cursive for headers)
│   └── index.css            # Global styles
├── assets/images/           # Floral decorative PNGs (corner1, corner2, floral-swirl)
└── main.tsx                 # React root entry point
```

### State Management: QuoteContext

The app uses **React Context API** to manage quote state globally. Key responsibilities:

1. **Quote Pool Management**
   - Loads local `quotes.json` on app init
   - Maintains array of all available quotes for random selection

2. **Daily Quote Caching**
   - Fetches one quote per calendar day from API Ninjas (external source)
   - Caches in localStorage with timestamp to avoid redundant API calls

3. **Metadata Tracking** (localStorage key: `quoteMeta:v1`)

   ```
   {
     "quote text": { lastShownAt: 1234567890, count: 5 },
     ...
   }
   ```

   - `lastShownAt` — Prevents showing the same quote repeatedly
   - `count` — Tracks frequency to weight randomization fairly

4. **Weighted Random Selection**
   - Candidates are filtered based on `lastShownAt` (ignores quotes shown in last 24h)
   - Selected from remaining pool using exponential decay weighting
   - Ensures fresh, varied experiences across sessions

**Usage in components:**

```tsx
import { useQuote } from "./quote/QuoteContext";

const { current, randomize, refreshDaily } = useQuote();
```

---

## Development Workflow

### Available Scripts

| Script          | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `npm run dev`   | Start Vite dev server with HMR; opens at http://localhost:5173 |
| `npm run build` | Minified production build → `dist/` folder                     |

### Hot Module Replacement (HMR)

- Edit `.tsx`, `.css`, or `.json` files → changes appear in browser instantly (no page refresh)
- State in React components is preserved during HMR

### Path Alias

All imports use the `@` alias pointing to `src/`:

```tsx
import { DailyQuote } from "@/app/components/DailyQuote";
import { Button } from "@/app/components/ui/button";
```

### Styling System

**Tailwind CSS** is the primary styling layer:

- Utility-first approach for rapid UI building
- Fully configured with custom colors in `tailwind.config.mjs` (pink/rose/gradient palette)
- Supports responsive breakpoints: `sm:`, `md:`, `lg:`, etc.

**Emotion** layers on top for complex, component-scoped styles:

- Used alongside Tailwind in components that need dynamic styles
- Full CSS power when Tailwind utilities aren't enough

**Example** — Gradient background in [App.tsx](src/app/App.tsx):

```tsx
className = "bg-gradient-to-br from-pink-200 via-rose-200 to-pink-300";
```

---

## Key Files Reference

| File                                                                   | Purpose                                                                      |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [src/app/App.tsx](src/app/App.tsx)                                     | Main layout; renders decorative corner images, gradient container, main card |
| [src/app/quotes.json](src/app/quotes.json)                             | Quote database; each entry has `text` and optional `author`                  |
| [src/app/components/DailyQuote.tsx](src/app/components/DailyQuote.tsx) | Quote card component; displays text, author, copy/share buttons              |
| [src/app/quote/QuoteContext.tsx](src/app/quote/QuoteContext.tsx)       | Context provider; manages state, caching, weighted randomization             |
| [src/styles/theme.css](src/styles/theme.css)                           | CSS variables for reusable colors, spacing, shadows                          |
| [tsconfig.json](tsconfig.json)                                         | TypeScript config; enables `@` path alias, ES2020 target                     |
| [vite.config.ts](vite.config.ts)                                       | Vite build config; React plugin, Tailwind CSS Vite plugin                    |

---

## Common Tasks

### Add a New Quote

Edit [src/app/quotes.json](src/app/quotes.json):

```json
{
  "text": "Your quote here",
  "author": "Author Name"
}
```

The app instantly picks it up on next reload.

### Customize Colors

Edit `tailwind.config.mjs` or [src/styles/theme.css](src/styles/theme.css) (CSS variables):

```css
:root {
  --primary: #ec4899; /* pink-500 */
  --accent: #f43f5e; /* rose-500 */
}
```

### Add a UI Component

The `src/app/components/ui/` folder contains 40+ Radix UI primitives pre-configured. Import and use:

```tsx
import { Button } from "@/app/components/ui/button";

export default function MyComponent() {
  return <Button>Click me</Button>;
}
```

---

## Troubleshooting

| Issue                         | Solution                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Port 5173 already in use      | `npm run dev -- --port 3000`                                                                                                                |
| Images not loading            | Check [src/app/components/figma/ImageWithFallback.tsx](src/app/components/figma/ImageWithFallback.tsx); fallback renders on network failure |
| Quotes cache is stale         | Clear localStorage: `localStorage.clear()` in browser DevTools console                                                                      |
| TypeScript errors in IDE      | Ensure `typescript` v5+ is installed; restart TS server (Cmd+Shift+P → "TypeScript: Restart TS Server")                                     |
| Tailwind classes not applying | Run `npm i` to ensure latest `@tailwindcss/vite` plugin is installed                                                                        |

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## License & Attribution

Design by [Figma](https://www.figma.com/design/OfceSqYCteZ3dhvI22TVoz/Floral-Quote-Webpage). See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party credits.
