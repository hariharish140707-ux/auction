import React, { useState, useEffect } from 'react';

interface PlayerLike {
  name: string;
  role?: string;
  country?: string;
  image?: string | null;
  overallRating?: number;
}

interface PlayerPortraitProps {
  player?: PlayerLike | null;
  name?: string;
  className?: string;
  imgClassName?: string;
  aspectRatio?: 'square' | 'card' | 'circle';
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK = '/images/players/fallback-portrait.png';

export function getPlayerImageUri(player?: PlayerLike | string | null): string {
  if (!player) return DEFAULT_FALLBACK;
  if (typeof player === 'string') {
    const slug = player.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `/images/players/${slug}.png`;
  }
  if (player.image && player.image.trim()) {
    return player.image;
  }
  const slug = (player.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `/images/players/${slug}.png`;
}

export const PlayerPortrait: React.FC<PlayerPortraitProps> = ({
  player,
  name,
  className = '',
  imgClassName = '',
  aspectRatio = 'card',
  fallbackSrc = DEFAULT_FALLBACK,
}) => {
  const playerName = player?.name || name || 'Player';
  const primarySrc = getPlayerImageUri(player || playerName);

  const [currentSrc, setCurrentSrc] = useState<string>(primarySrc);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Reset state if player or source changes
  useEffect(() => {
    setCurrentSrc(primarySrc);
    setHasError(false);
    setIsLoading(true);
  }, [primarySrc]);

  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      // Switch gracefully to the professional studio fallback
      setCurrentSrc(fallbackSrc);
      setIsLoading(false);
    } else {
      // If even fallback fails, flag hard error to show sleek fallback UI
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const aspectStyles = {
    square: 'aspect-square',
    card: 'w-full h-full',
    circle: 'rounded-full aspect-square',
  }[aspectRatio];

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-[#091b38] via-[#051126] to-[#020914] flex items-center justify-center ${aspectStyles} ${className}`}
    >
      {/* Subtle stadium light vignette overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/30 pointer-events-none z-10" />

      {/* Loading shimmer indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/40 animate-pulse z-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
        </div>
      )}

      {!hasError ? (
        <img
          src={currentSrc}
          alt={`${playerName} official national portrait`}
          className={`w-full h-full object-cover object-top transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${imgClassName}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="eager"
        />
      ) : (
        /* Sleek dark metallic fallback */
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 z-10">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-lg flex items-center justify-center text-2xl font-black text-amber-400 mb-2">
            {playerName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)}
          </div>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {player?.role ? player.role.replace('_', ' ') : 'CRICKETER'}
          </span>
        </div>
      )}
    </div>
  );
};

export default PlayerPortrait;
