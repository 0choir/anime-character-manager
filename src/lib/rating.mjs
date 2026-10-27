export const SCORE_FIELDS = [
  { key: 'score_looks', label: 'ルックス', color: '#db4f83' },
  { key: 'score_personality', label: '性格', color: '#29966e' },
  { key: 'score_voice', label: '声', color: '#8562ca' },
  { key: 'score_cuteness', label: '可愛さ・格好良さ', color: '#c18a20' },
  { key: 'score_other', label: 'その他', color: '#397ace' },
];
export const BREAKDOWNS = {
  looks_breakdown: { score: 'score_looks', fields: [ ['face', '顔', 50], ['hair', '髪型・髪色', 15], ['body', '体型', 10], ['bust', 'バスト', 15], ['expression', '表情', 10] ] },
  other_breakdown: { score: 'score_other', fields: [ ['sense', 'センス', 50], ['ability', '能力', 25], ['cleanliness', '清潔', 15], ['age', '年齢', 10] ] },
};
export const normalize = (value) => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('ja');
export const idOf = (row) => String(row.character_id ?? row.id);
export const rowKey = (row) => String(row.snapshot_row_id ?? row.character_id ?? row.id);
export const sumScores = (row) => SCORE_FIELDS.reduce((sum, { key }) => sum + Number(row[key] ?? 0), 0);
export const signed = (value) => value > 0 ? `+${value}` : String(value);
export function japanDate(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function formatDate(value) {
  if (!value) return '日時未記録';
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function emptyCharacter() {
  return { character_name: '', title_id: '', voice_actor_id: '', registered_year: japanDate().slice(0, 4), ...Object.fromEntries(SCORE_FIELDS.map(({key}) => [key, 50])), looks_breakdown: null, other_breakdown: null, reason: '' };
}
// Opening a breakdown preserves the saved score. This allocation is only an editable starting point.
export function allocateBreakdown(score, fields) {
  const target = Math.max(0, Math.min(100, Number(score)));
  const values = fields.map(([, , max]) => Math.floor(target * max / 100));
  let rest = target - values.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i = (i + 1) % fields.length) {
    if (values[i] < fields[i][2]) { values[i]++; rest--; }
  }
  return Object.fromEntries(fields.map(([key], index) => [key, values[index]]));
}
export function validateCharacter(row) {
  if (!String(row.character_name ?? '').trim()) throw new Error('キャラクター名を入力してください。');
  if (!row.title_id && !String(row.title_name ?? '').trim()) throw new Error('作品を指定してください。');
  if (String(row.character_name).trim().length > 200) throw new Error('キャラクター名は200文字以内にしてください。');
  for (const { key, label } of SCORE_FIELDS) {
    if (!Number.isInteger(row[key]) || row[key] < 0 || row[key] > 100) throw new Error(`${label}は0〜100の整数にしてください。`);
  }
  if (row.registered_year !== '' && row.registered_year != null && (!Number.isInteger(Number(row.registered_year)) || Number(row.registered_year) < 1900 || Number(row.registered_year) > 2200)) throw new Error('登録年は1900〜2200の整数にしてください。');
  for (const [key, config] of Object.entries(BREAKDOWNS)) {
    if (!row[key]) continue;
    if (typeof row[key] !== 'object' || Array.isArray(row[key]) || Object.keys(row[key]).length !== config.fields.length || config.fields.some(([field, , max]) => !Number.isInteger(row[key][field]) || row[key][field] < 0 || row[key][field] > max)) throw new Error('採点内訳の値が不正です。');
    if (config.fields.reduce((s, [field]) => s + Number(row[key][field]), 0) !== Number(row[config.score])) throw new Error('採点内訳と合計点が一致しません。');
  }
  return row;
}
export function filterRankings(rows, filters = {}) {
  const q = normalize(filters.query);
  const filtered = rows.filter(row => (!q || [row.character_name, row.title_name, row.voice_actor_name].some(v => normalize(v).includes(q)))
    && (!filters.title || row.title_name === filters.title)
    && (!filters.voice || row.voice_actor_name === filters.voice)
    && (!filters.year || String(row.registered_year ?? '') === filters.year)
    && (!filters.tier || row.tier_name === filters.tier));
  const [key = 'current_rank', dir = 'asc'] = (filters.sort || 'current_rank:asc').split(':');
  return filtered.sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv != null) return 1;
    if (bv == null && av != null) return -1;
    const diff = key === 'character_name' ? String(av).localeCompare(String(bv), 'ja') : Number(av ?? 0) - Number(bv ?? 0);
    return (dir === 'desc' ? -diff : diff) || Number(a.current_rank ?? 0) - Number(b.current_rank ?? 0) || idOf(a).localeCompare(idOf(b));
  });
}
export function compareSnapshots(current, previous) {
  const a = Map.groupBy(current, idOf), b = Map.groupBy(previous, idOf);
  return [...new Set([...a.keys(), ...b.keys()])].flatMap(id => {
    const nowRows = a.get(id) || [], oldRows = b.get(id) || [];
    if (nowRows.length > 1 || oldRows.length > 1) {
      return [{ ...(nowRows[0] || oldRows[0]), status: 'ambiguous', previous: oldRows, current: nowRows, score_delta: null, rank_delta: null }];
    }
    const now = nowRows[0], old = oldRows[0];
    return [{ ...(now || old), status: !old ? 'new' : !now ? 'removed' : 'matched', previous: old, current: now,
      score_delta: now && old ? Number(now.total_score) - Number(old.total_score) : null,
      rank_delta: now && old ? Number(old.current_rank) - Number(now.current_rank) : null,
      deltas: now && old ? Object.fromEntries(SCORE_FIELDS.map(({key}) => [key, Number(now[key]) - Number(old[key])])) : null }];
  });
}
export function aggregateRankings(rows, field) {
  return [...Map.groupBy(rows.filter(row => row[field]), row => row[field]).entries()].map(([name, members]) => ({
    name, count: members.length, average: members.reduce((sum, row) => sum + Number(row.total_score), 0) / members.length,
    best: [...members].sort((a,b) => Number(b.total_score) - Number(a.total_score) || Number(a.current_rank) - Number(b.current_rank))[0],
  })).sort((a,b) => b.average - a.average || b.count - a.count || a.name.localeCompare(b.name, 'ja'));
}

