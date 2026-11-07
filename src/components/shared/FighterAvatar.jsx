import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { resolveFighterImage, fetchWikipediaPortrait } from '@/lib/fighterImage';

const SIZES = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-2xl',
};

export default function FighterAvatar({ fighter, size = 'md', className, showSource = false }) {
  const name = fighter?.name || '?';
  const { url: staticUrl, source: staticSource } = resolveFighterImage(fighter);

  const [resolvedUrl, setResolvedUrl] = useState(staticUrl);
  const [source, setSource] = useState(staticSource);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    // Never show a rejected image
    if (fighter?.image_confidence === 'rejected' && !fighter?.preferred_profile_image_url) {
      setResolvedUrl(null);
      setSource(null);
      return;
    }
    const { url, source: src } = resolveFighterImage(fighter);
    if (url) {
      setResolvedUrl(url);
      setSource(src);
    } else if (name && name !== '?') {
      // Fallback: fetch Wikipedia portrait
      fetchWikipediaPortrait(name).then(wikiUrl => {
        setResolvedUrl(wikiUrl);
        setSource(wikiUrl ? 'wikipedia' : null);
      });
    } else {
      setResolvedUrl(null);
      setSource(null);
    }
  }, [fighter?.preferred_profile_image_url, fighter?.image_url, name]);

  const displayUrl = imgError ? null : resolvedUrl;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={cn('relative shrink-0', className)}>
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={name}
          className={cn(
            'rounded-full border-2 border-border/40',
            'object-cover object-top',  // object-top biases toward face
            SIZES[size]
          )}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={cn(
          'rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center font-bold text-muted-foreground border-2 border-border/40',
          SIZES[size]
        )}>
          {initials}
        </div>
      )}
      {showSource && source && (
        <span className="absolute -bottom-1 -right-1 text-[8px] bg-background border border-border/60 px-1 rounded-full text-muted-foreground leading-none py-0.5">
          {source}
        </span>
      )}
    </div>
  );
}