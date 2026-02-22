import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { QuoteProvider } from './quote/QuoteContext';
import DailyQuote from './components/DailyQuote';

export default function App() {
  const unsplashBase =
    'https://images.unsplash.com/photo-1599215966323-88d801b84771?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5rJTIwZmxvd2VycyUyMGJvdXF1ZXR8ZW58MXx8fHwxNzcxNzM0NDMyfDA&ixlib=rb-4.1.0&q=80'

  return (
    <QuoteProvider>
      <div className="relative size-full min-h-screen bg-gradient-to-br from-pink-200 via-rose-200 to-pink-300 flex items-center justify-center p-6 overflow-hidden">
      {/* Decorative images fixed to viewport corners */}
      <ImageWithFallback
        src="/assets/images/corner1.png"
        alt=""
        aria-hidden="true"
        className="fixed top-0 left-0 pointer-events-none opacity-100 z-10"
        style={{ width: 'clamp(600px, 100vw, 800px)', height: 'auto', filter: 'brightness(0) invert(1)', transform: 'scaleX(-1) rotate(180deg)' }}
      />

      <ImageWithFallback
        src="/assets/images/corner2.png"
        alt=""
        aria-hidden="true"
        className="fixed bottom-0 right-0 pointer-events-none opacity-100 z-10"
        style={{ width: 'clamp(600px, 100vw, 800px)', height: 'auto', filter: 'brightness(0) invert(1)', transform: 'scaleX(-1)' }}
      />

      {/* Main content card and swirl container */}
      <div className="relative w-full max-w-2xl">
        <div className="w-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border-4 border-pink-200 relative z-40">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl text-pink-600 mb-2" style={{ fontFamily: 'cursive' }}>
              from me to you
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-pink-300 via-rose-400 to-pink-300 mx-auto rounded-full"></div>
          </div>

          {/* Image */}
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg border-4 border-pink-100 relative z-20">
            <ImageWithFallback
              src={`${unsplashBase}&w=1080`}
              srcSet={`${unsplashBase}&w=480 480w, ${unsplashBase}&w=768 768w, ${unsplashBase}&w=1080 1080w`}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 672px"
              alt="Pink flowers bouquet"
              className="w-full h-48 sm:h-56 md:h-64 lg:h-80 object-cover"
            />
          </div>

          {/* Quote */}
          <div className="text-center">
            <DailyQuote />

            {/* Swirl: keep inside the card just below author */}
            <div className="mt-4 flex justify-center" aria-hidden="true">
              <ImageWithFallback
                src="/assets/images/floral-swirl.png"
                alt=""
                className="opacity-90 object-contain pointer-events-none"
                style={{ width: 'clamp(140px, 28%, 420px)', height: 'auto', filter: 'brightness(0) invert(0)' }}
              />
            </div>
          </div>

        </div>
      </div>
      </div>
    </QuoteProvider>
  );
}
