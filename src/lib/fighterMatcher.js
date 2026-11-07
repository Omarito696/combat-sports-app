/**
 * Fighter Identity Matcher
 * 
 * NEVER match fighters by name alone. Always try stable IDs first.
 * 
 * Confidence levels:
 *   high   — matched by at least one stable external ID (wikidata_id, thesportsdb_id, ufc_url, sherdog_url, tapology_url)
 *   medium — name matches AND at least one secondary attribute matches (weight_class, nationality, dob)
 *   low    — name match only. Do NOT auto-assign fight records, images, or bios at this level.
 */

/**
 * Attempt to match a raw external record to a known fighter in the DB.
 * Returns { fighter, confidence, reasons[] } or { fighter: null, confidence: 'low', reasons[] }
 */
export function matchFighter(dbFighters, externalRecord) {
  const reasons = [];
  let bestMatch = null;
  let bestScore = 0;

  for (const f of dbFighters) {
    let score = 0;
    const matchReasons = [];

    // ── Stable ID checks (each worth 100pts) ──────────────────────────────────
    if (externalRecord.wikidata_id && f.wikidata_id && externalRecord.wikidata_id === f.wikidata_id) {
      score += 100; matchReasons.push('wikidata_id');
    }
    if (externalRecord.thesportsdb_id && f.thesportsdb_id && externalRecord.thesportsdb_id === f.thesportsdb_id) {
      score += 100; matchReasons.push('thesportsdb_id');
    }
    if (externalRecord.ufc_url && f.ufc_url && externalRecord.ufc_url === f.ufc_url) {
      score += 100; matchReasons.push('ufc_url');
    }
    if (externalRecord.sherdog_url && f.sherdog_url && externalRecord.sherdog_url === f.sherdog_url) {
      score += 100; matchReasons.push('sherdog_url');
    }
    if (externalRecord.tapology_url && f.tapology_url && externalRecord.tapology_url === f.tapology_url) {
      score += 100; matchReasons.push('tapology_url');
    }

    // ── Name check (worth 30pts) ──────────────────────────────────────────────
    const nameSimilarity = compareNames(f.name, externalRecord.name);
    if (nameSimilarity > 0.85) {
      score += 30; matchReasons.push(`name:${nameSimilarity.toFixed(2)}`);
    } else if (nameSimilarity > 0.6) {
      score += 10; matchReasons.push(`name-partial:${nameSimilarity.toFixed(2)}`);
    }

    // ── Secondary attributes (each worth 15pts) ───────────────────────────────
    if (externalRecord.weight_class && f.weight_class &&
        normalizeWeightClass(externalRecord.weight_class) === normalizeWeightClass(f.weight_class)) {
      score += 15; matchReasons.push('weight_class');
    }
    if (externalRecord.nationality && f.nationality &&
        externalRecord.nationality.toLowerCase() === f.nationality.toLowerCase()) {
      score += 15; matchReasons.push('nationality');
    }
    if (externalRecord.date_of_birth && f.date_of_birth &&
        externalRecord.date_of_birth.slice(0, 10) === f.date_of_birth.slice(0, 10)) {
      score += 20; matchReasons.push('date_of_birth');
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { fighter: f, score, matchReasons };
    }
  }

  if (!bestMatch || bestScore === 0) {
    return { fighter: null, confidence: 'low', reasons: ['no_match'] };
  }

  // Determine confidence from score
  const hasStableId = bestMatch.matchReasons.some(r =>
    ['wikidata_id','thesportsdb_id','ufc_url','sherdog_url','tapology_url'].includes(r)
  );
  const hasName = bestMatch.matchReasons.some(r => r.startsWith('name:'));
  const hasSecondary = bestMatch.matchReasons.some(r =>
    ['weight_class','nationality','date_of_birth'].includes(r)
  );

  let confidence;
  if (hasStableId) {
    confidence = 'high';
  } else if (hasName && hasSecondary) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    fighter: bestMatch.fighter,
    confidence,
    score: bestMatch.score,
    reasons: bestMatch.matchReasons,
  };
}

/**
 * Validate that external data is safe to assign to a fighter.
 * Returns { safe: boolean, warnings: string[] }
 */
export function validateDataAssignment(fighter, incomingData, confidence) {
  const warnings = [];

  // Never auto-assign at low confidence
  if (confidence === 'low') {
    warnings.push('LOW_CONFIDENCE: Data matched by name only — manual review required before assigning');
    return { safe: false, warnings };
  }

  // Suspicious record change: win/loss record shifted dramatically
  if (incomingData.wins != null && fighter.wins != null) {
    const winDiff = Math.abs(incomingData.wins - fighter.wins);
    if (winDiff > 5) {
      warnings.push(`SUSPICIOUS_RECORD_CHANGE: Win count changed by ${winDiff} (${fighter.wins} → ${incomingData.wins})`);
    }
  }
  if (incomingData.losses != null && fighter.losses != null) {
    const lossDiff = Math.abs(incomingData.losses - fighter.losses);
    if (lossDiff > 5) {
      warnings.push(`SUSPICIOUS_RECORD_CHANGE: Loss count changed by ${lossDiff} (${fighter.losses} → ${incomingData.losses})`);
    }
  }

  // Weight class mismatch
  if (incomingData.weight_class && fighter.weight_class &&
      normalizeWeightClass(incomingData.weight_class) !== normalizeWeightClass(fighter.weight_class)) {
    warnings.push(`WEIGHT_CLASS_MISMATCH: DB has "${fighter.weight_class}", incoming is "${incomingData.weight_class}"`);
  }

  // Nationality mismatch
  if (incomingData.nationality && fighter.nationality &&
      incomingData.nationality.toLowerCase() !== fighter.nationality.toLowerCase()) {
    warnings.push(`NATIONALITY_MISMATCH: DB has "${fighter.nationality}", incoming is "${incomingData.nationality}"`);
  }

  const safe = warnings.length === 0;
  return { safe, warnings };
}

/**
 * Check all fighters in the DB for cross-contamination warnings.
 * Returns array of { type, message, fighters[] }
 */
export function auditFighters(fighters) {
  const issues = [];

  // Check for duplicate records (same wins/losses/draws across different fighters)
  const recordMap = {};
  for (const f of fighters) {
    if (f.wins == null && f.losses == null) continue;
    const key = `${f.wins}-${f.losses}-${f.draws || 0}`;
    if (!recordMap[key]) recordMap[key] = [];
    recordMap[key].push(f);
  }
  for (const [record, group] of Object.entries(recordMap)) {
    if (group.length > 1 && record !== '0-0-0') {
      issues.push({
        type: 'DUPLICATE_RECORD',
        message: `Record ${record} shared by: ${group.map(f => f.name).join(', ')}`,
        fighters: group,
        severity: 'error',
      });
    }
  }

  // Check for fighters missing stable IDs
  for (const f of fighters) {
    const hasStableId = f.wikidata_id || f.thesportsdb_id || f.ufc_url || f.sherdog_url || f.tapology_url;
    if (!hasStableId && f.data_quality !== 'stub') {
      issues.push({
        type: 'MISSING_STABLE_ID',
        message: `${f.name} has no stable external ID — matching is unreliable`,
        fighters: [f],
        severity: 'warning',
      });
    }
  }

  // Known problematic pair: Ankalaev vs Pereira (different fighters, both MMA LHW)
  const ankalaev = fighters.find(f => f.name?.toLowerCase().includes('ankalaev'));
  const pereira = fighters.find(f => f.name?.toLowerCase().includes('pereira') && f.discipline === 'MMA');
  if (ankalaev && pereira) {
    const ankaRecord = `${ankalaev.wins}-${ankalaev.losses}`;
    const perRecord = `${pereira.wins}-${pereira.losses}`;
    // Ankalaev's real record is approximately 20-1-1, Pereira's is approximately 12-2
    if (ankalaev.wins > 18 && pereira.wins > 18) {
      issues.push({
        type: 'CROSS_CONTAMINATION',
        message: `Ankalaev (${ankaRecord}) and Pereira (${perRecord}) may have swapped records. Ankalaev real record ~20-1-1, Pereira real record ~12-2.`,
        fighters: [ankalaev, pereira],
        severity: 'error',
      });
    }
    if (ankalaev.wins != null && pereira.wins != null && ankalaev.wins === pereira.wins && ankalaev.losses === pereira.losses) {
      issues.push({
        type: 'CROSS_CONTAMINATION',
        message: `Ankalaev and Pereira have identical records (${ankaRecord}) — data was likely cross-assigned!`,
        fighters: [ankalaev, pereira],
        severity: 'error',
      });
    }
  }

  return issues;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function compareNames(a, b) {
  if (!a || !b) return 0;
  const normalize = s => s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  // Check if one contains the other (handles "Alex Pereira" vs "Poatan")
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  // Jaccard similarity on words
  const wa = new Set(na.split(/\s+/));
  const wb = new Set(nb.split(/\s+/));
  const intersection = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

export function normalizeWeightClass(wc) {
  if (!wc) return '';
  return wc.toLowerCase()
    .replace(/\s+/g, '')
    .replace('lightheavyweight', 'lhw')
    .replace('heavyweight', 'hw')
    .replace('middleweight', 'mw')
    .replace('welterweight', 'ww')
    .replace('lightweight', 'lw')
    .replace('featherweight', 'fw')
    .replace('bantamweight', 'bw')
    .replace('flyweight', 'flyw');
}