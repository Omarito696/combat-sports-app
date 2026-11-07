/**
 * FightTracker Data Merge Service
 * 
 * Field-level multi-source merging engine.
 * Principle: different sources own different fields. Merge them, don't replace them.
 * 
 * Source priority (per field):
 *   1. Official organization website
 *   2. Official event/result page
 *   3. Official athlete profile
 *   4. Trusted sports database (TheSportsDB, Sherdog, Tapology, BoxRec)
 *   5. Secondary database (Wikipedia, Wikidata)
 *   6. Manual admin override
 *   7. Placeholder/fallback
 * 
 * NEVER overwrite a higher-confidence field with a lower-confidence one.
 * Field-level source tracking required for every field.
 */

import { canOverwriteField } from './verification';

// ─── SOURCE TYPE RANKING ──────────────────────────────────────────────────────

const SOURCE_PRIORITY = {
  official_org: 1,
  manual: 2,
  sports_db: 3,
  wikipedia: 4,
  wikimedia: 4,
  unknown: 5,
};

const CONFIDENCE_PRIORITY = {
  high: 1,
  medium: 2,
  low: 3,
};

// ─── FIGHTER FIELD MERGE ──────────────────────────────────────────────────────

/**
 * Merge fighter data from multiple sources, field by field.
 * Each field keeps its own source_url, source_type, confidence.
 * 
 * @param existing - Current DB fighter record
 * @param sources - Array of source data objects [{ source_type, source_url, data: { field: value } }]
 */
export function mergeFighterData(existing, sources) {
  const merged = { ...existing };
  
  // Sort sources by priority
  sources.sort((a, b) => {
    const pa = SOURCE_PRIORITY[a.source_type] || 99;
    const pb = SOURCE_PRIORITY[b.source_type] || 99;
    return pa - pb;
  });

  for (const source of sources) {
    const data = source.data || {};
    
    for (const [field, newValue] of Object.entries(data)) {
      if (newValue == null || newValue === '') continue;
      
      const existingValue = merged[field];
      const existingConf = merged[`${field}_confidence`] || merged.data_confidence;
      const existingSource = merged[`${field}_source_type`] || merged.image_source_type;
      
      const check = canOverwriteField(
        existingValue, existingConf, existingSource,
        newValue, source.confidence || 'low', source.source_type,
        field
      );
      
      if (check.can_overwrite) {
        merged[field] = newValue;
        
        // Track source for this field
        const srcField = `${field}_source_url`;
        const typeField = `${field}_source_type`;
        const confField = `${field}_confidence`;
        const timeField = `${field}_last_verified_at`;
        
        if (merged.hasOwnProperty(srcField) || srcField === 'record_source_url' || srcField === 'weight_source_url') {
          merged[srcField] = source.source_url || merged[srcField];
        }
        if (merged.hasOwnProperty(typeField) || typeField === 'record_source_type' || typeField === 'weight_source_type') {
          merged[typeField] = source.source_type;
        }
        if (merged.hasOwnProperty(confField) || confField === 'record_confidence') {
          merged[confField] = source.confidence || 'medium';
        }
        if (merged.hasOwnProperty(timeField)) {
          merged[timeField] = new Date().toISOString();
        }
      }
    }
  }

  return merged;
}

/**
 * Build structured data from an official organization source.
 * Returns an object formatted for mergeFighterData.
 */
export function buildFighterSource(sourceType, sourceUrl, confidence, data) {
  return {
    source_type: sourceType,
    source_url: sourceUrl,
    confidence,
    data,
  };
}

// ─── FIGHT RESULT MERGE ────────────────────────────────────────────────────────

/**
 * Merge fight result data from a verified source.
 * Only creates/updates results if source is at least sports_db quality.
 */
export function mergeFightResult(fight, sourceUrl, sourceType, resultData) {
  const updates = {};
  
  if (SOURCE_PRIORITY[sourceType] > SOURCE_PRIORITY.sports_db) {
    return { merged: false, reason: `Source type ${sourceType} is below minimum confidence for fight results`, updates };
  }
  
  // Only add results if current fight has no result source
  if (fight.result_source_url && SOURCE_PRIORITY[fight.result_source_type || 'unknown'] <= SOURCE_PRIORITY[sourceType]) {
    return { merged: false, reason: 'Existing result from equal or higher quality source', updates };
  }
  
  if (resultData.winner_name) updates.winner_name = resultData.winner_name;
  if (resultData.method) updates.method = resultData.method;
  if (resultData.finish_round) updates.finish_round = resultData.finish_round;
  if (resultData.finish_time) updates.finish_time = resultData.finish_time;
  
  updates.result_source_url = sourceUrl;
  updates.result_source_type = sourceType;
  updates.result_confidence = 'high';
  
  return { merged: true, reason: 'Result from verified source', updates };
}

// ─── EVENT DATA MERGE ──────────────────────────────────────────────────────────

/**
 * Merge event data (date, venue, card) from sources.
 */
export function mergeEventData(event, sourceUrl, sourceType, data) {
  const updates = {};
  
  // Date: only update if we have a better source
  if (data.date && (!event.date_source_type || SOURCE_PRIORITY[sourceType] <= SOURCE_PRIORITY[event.date_source_type || 'unknown'])) {
    updates.date = data.date;
    updates.date_source_url = sourceUrl;
    updates.date_source_type = sourceType;
  }
  
  // Venue/location: fill if missing
  if (data.venue && !event.venue) updates.venue = data.venue;
  if (data.location && !event.location) updates.location = data.location;
  
  // Card source: tracks where we got the fight list
  if (!event.card_source_url && data.fight_count && data.fight_count > 0) {
    updates.card_source_url = sourceUrl;
    updates.card_source_type = sourceType;
  }
  
  if (Object.keys(updates).length > 0) {
    return { merged: true, updates };
  }
  return { merged: false, updates: {} };
}

// ─── IMAGE MERGE ───────────────────────────────────────────────────────────────

/**
 * Determine the best image to use from multiple sources.
 * Priority: official_org > manual (admin) > media_day > publicity > sports_db > wikipedia
 * 
 * Never replace an approved image with an unverified one.
 */
export function mergeFighterImage(existing, sources) {
  // Admin override always wins
  if (existing.preferred_profile_image_url) {
    return { url: existing.preferred_profile_image_url, source: 'admin_override', source_type: 'manual' };
  }

  // Existing approved image wins
  if (existing.image_url && existing.image_confidence === 'approved') {
    return { url: existing.image_url, source: existing.image_source, source_type: existing.image_source_type };
  }

  // Sort candidate images by source quality
  const candidates = sources
    .filter(s => s.image_url)
    .sort((a, b) => (SOURCE_PRIORITY[a.source_type] || 99) - (SOURCE_PRIORITY[b.source_type] || 99));

  for (const candidate of candidates) {
    // Wikipedia/wikimedia only if no better source
    if (candidate.source_type === 'wikipedia' || candidate.source_type === 'wikimedia') {
      if (!existing.image_url) {
        return { url: candidate.image_url, source: candidate.source_type, source_type: candidate.source_type, confidence: 'unverified' };
      }
      continue;
    }
    
    // Official org or sports_db image → use if existing is unverified
    if (!existing.image_url || existing.image_confidence !== 'approved') {
      return { url: candidate.image_url, source: candidate.source_type, source_type: candidate.source_type, confidence: 'auto' };
    }
  }

  // Fallback: keep existing
  return { url: existing.image_url, source: existing.image_source, source_type: existing.image_source_type };
}