/**
 * Fighter Image Resolution — Quality-Aware Priority Chain
 * 
 * Priority (highest to lowest):
 *   1. Admin-approved override (preferred_profile_image_url)
 *   2. Official organization profile image (image_source_type = 'official_org')
 *   3. Official publicity/media day image (image_source_type = 'media_day' or 'publicity_headshot')
 *   4. Trusted sports database profile-style image (image_source_type = 'sports_db')
 *   5. Placeholder — clean headshot silhouette placeholder
 *   6. Wikipedia/Wikimedia — last resort fallback only
 * 
 * NEVER display:
 *   - Rejected images (image_confidence = 'rejected')
 *   - Unverified images without admin approval (image_pending_review = true without preferred_profile_image_url)
 *   - Random action shots as profile images
 * 
 * Object-fit: cover + object-top to bias toward face
 */

import { DISPLAY_TIER } from './verification';

// ─── SOURCE TYPE RANKING ────────────────────────────────────────────────────────

export const IMAGE_SOURCE_RANK = [
  'official_org',       // 1. Official org profile page
  'media_day',          // 2. Official media day photo
  'publicity_headshot', // 3. Official publicity headshot
  'sports_db',          // 4. Trusted sports database
  'placeholder',        // 5. Generated placeholder
  'wikipedia',          // 6. Wikipedia fallback
  'wikimedia',          // 7. Wikimedia Commons
  'unknown',            // 8. Unknown source
];

export const IMAGE_SOURCE_LABELS = {
  official_org: 'Official',
  media_day: 'Media Day',
  publicity_headshot: 'Publicity',
  sports_db: 'Database',
  wikipedia: 'Wikipedia',
  wikimedia: 'Wikimedia',
  unknown: 'Unknown',
  placeholder: 'Placeholder',
};

// Color coding for source badges
export const IMAGE_SOURCE_COLORS = {
  official_org: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  media_day: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  publicity_headshot: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  sports_db: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  wikipedia: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  wikimedia: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  placeholder: 'bg-muted text-muted-foreground border-border',
  unknown: 'bg-muted text-muted-foreground border-border',
};

// ─── WIKIPEDIA FETCH ────────────────────────────────────────────────────────────

const cache = {};

/**
 * Fetch Wikipedia portrait image. LAST RESORT fallback only.
 * Used when no better source exists.
 */
export async function fetchWikipediaPortrait(name) {
  if (cache[name] !== undefined) return cache[name];
  try {
    const slug = name.replace(/ /g, '_');
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) { cache[name] = null; return null; }
    const data = await res.json();
    let url = data?.originalimage?.source || data?.thumbnail?.source || null;
    if (url) url = url.replace(/\/\d+px-/, '/320px-');
    cache[name] = url;
    return url;
  } catch {
    cache[name] = null;
    return null;
  }
}

// ─── IMAGE RESOLUTION ───────────────────────────────────────────────────────────

/**
 * Resolve the best image for a fighter following the quality priority chain.
 * Returns { url, source, source_type, rank } or { url: null, source: null }
 * 
 * Rules:
 *   - preferred_profile_image_url ALWAYS wins (admin override)
 *   - Rejected images are NEVER returned
 *   - Unverified images without preferred override are skipped
 *   - Wikipedia only used as last resort
 */
export function resolveFighterImage(fighter) {
  if (!fighter) return { url: null, source: null, source_type: null, rank: null };

  // 1. Admin-approved override — always wins
  if (fighter.preferred_profile_image_url) {
    return {
      url: fighter.preferred_profile_image_url,
      source: 'preferred',
      source_type: 'official_org',
      rank: 0,
    };
  }

  // 2. DB image — only if approved/auto and not rejected
  if (fighter.image_url) {
    // Rejected images never shown
    if (fighter.image_confidence === 'rejected') {
      return { url: null, source: null, source_type: null, rank: null };
    }

    // Unverified + pending review — skip unless no other source
    if (fighter.image_pending_review && fighter.image_confidence === 'unverified') {
      // Skip to next source
    } else {
      const sourceType = fighter.image_source_type || 'unknown';
      const rank = IMAGE_SOURCE_RANK.indexOf(sourceType);
      return {
        url: fighter.image_url,
        source: fighter.image_source || 'database',
        source_type: sourceType,
        rank: rank >= 0 ? rank : 99,
      };
    }
  }

  // 3. No usable image found
  return { url: null, source: null, source_type: null, rank: null };
}

/**
 * Get image display metadata: source label, color, and whether it's a placeholder.
 */
export function getImageSourceMeta(fighter) {
  const resolved = resolveFighterImage(fighter);
  const sourceType = resolved.source_type || 'unknown';

  if (!resolved.url) {
    return {
      label: 'No image',
      color: IMAGE_SOURCE_COLORS.unknown,
      isPlaceholder: true,
      needsAcquisition: true,
    };
  }

  if (resolved.source === 'preferred') {
    return {
      label: 'Admin-approved',
      color: IMAGE_SOURCE_COLORS.official_org,
      isPlaceholder: false,
      needsAcquisition: false,
    };
  }

  return {
    label: IMAGE_SOURCE_LABELS[sourceType] || sourceType,
    color: IMAGE_SOURCE_COLORS[sourceType] || IMAGE_SOURCE_COLORS.unknown,
    isPlaceholder: sourceType === 'placeholder',
    needsAcquisition: sourceType === 'unknown' || sourceType === 'placeholder' || sourceType === 'wikipedia' || sourceType === 'wikimedia',
  };
}

/**
 * Check if a fighter needs image acquisition.
 * Returns true when: no image, placeholder, or only Wikipedia fallback.
 */
export function fighterNeedsImageAcquisition(fighter) {
  const meta = getImageSourceMeta(fighter);
  return meta.needsAcquisition || meta.isPlaceholder;
}