export function fightOutcome(fight) {
  if (fight.status !== 'completed') return null;
  const words = (fight.method || '').toLowerCase().replace(/[_-]/g, ' ');
  if (/\b(?:no contest|overturned|nc)\b/.test(words)) return { label: 'No contest' };
  if (/\bdraw\b/.test(words)) return { label: 'Draw' };
  const corners = ['a', 'b'];
  const corner = fight.winner_id && corners.find(side => fight[`fighter_${side}_id`] === fight.winner_id)
    || corners.find(side => fight.winner_name && fight[`fighter_${side}_name`] === fight.winner_name);
  return corner ? { label: 'Winner', corner } : { label: 'Result unavailable' };
}
