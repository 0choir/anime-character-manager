import { SCORE_FIELDS, validateCharacter, normalize, idOf } from './rating.mjs';

const COLUMNS = [ ['character_id', 'キャラクターID'], ['current_rank','順位'], ['title_honor','称号'], ['tier_name','Tier'], ['character_name','キャラクター名'], ['title_name','作品名'], ['voice_actor_name','担当声優'], ['registered_year','登録年'], ['total_score','合計点'], ...SCORE_FIELDS.map(({key,label}) => [key,label]), ['looks_breakdown','ルックス内訳'], ['other_breakdown','その他内訳'] ];
function cell(value) {
  let s = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  // Spreadsheet formula injection protection; reversed by our importer.
  if (/^['=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
export function toCSV(rows) {
  return '\uFEFF' + [COLUMNS.map(([, label]) => label), ...rows.map(row => COLUMNS.map(([key]) => row[key]))].map(row => row.map(cell).join(',')).join('\r\n');
}
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], value = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } }
      else value += c;
    } else if (c === '"' && value === '' && !closed) quoted = true;
    else if (c === ',') { row.push(value); value = ''; closed = false; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i+1] === '\n') i++;
      row.push(value); if (row.some(v => v !== '')) rows.push(row); row = []; value = ''; closed = false;
    } else {
      if (closed || c === '"') throw new Error('CSVの引用符が不正です。');
      value += c;
    }
  }
  if (quoted) throw new Error('CSVの引用符が閉じられていません。');
  row.push(value); if (row.some(v => v !== '')) rows.push(row);
  return rows;
}
export function readImport(text, filename) {
  if (/\.json$/i.test(filename)) {
    const data = JSON.parse(text);
    if (data.format !== 'anime-rating-backup' || data.version !== 1 || !Array.isArray(data.characters)) throw new Error('対応するバックアップJSONではありません。');
    return data.characters.filter(row => !row.deleted_at).map(row => ({...row, character_id: row.character_id ?? row.id}));
  }
  const [headers, ...rows] = parseCSV(text);
  if (!headers) throw new Error('ファイルが空です。');
  const aliases = new Map(COLUMNS.flatMap(([key,label]) => [[key,key],[label,key]]));
  aliases.set('可愛さ', 'score_cuteness'); aliases.set('声 (声優)', 'score_voice');
  const keys = headers.map(h => aliases.get(h.trim()));
  if (new Set(keys.filter(Boolean)).size !== keys.filter(Boolean).length) throw new Error('CSVの列名が重複しています。');
  for (const key of ['character_name','title_name', ...SCORE_FIELDS.map(f=>f.key)]) if (!keys.includes(key)) throw new Error(`CSVに必要な列がありません: ${COLUMNS.find(c=>c[0]===key)?.[1]}`);
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`${i+2}行目の列数が一致しません。`);
    const row = Object.fromEntries(keys.flatMap((key, idx) => key ? [[key, values[idx].replace(/^'(?=['=+\-@\t\r])/, '')]] : []));
    row.registered_year = ['', '-', '未設定'].includes(row.registered_year ?? '') ? null : Number(String(row.registered_year).replace(/年$/, ''));
    if (row.voice_actor_name === '未設定' || row.voice_actor_name === '-') row.voice_actor_name = '';
    for (const {key} of SCORE_FIELDS) row[key] = row[key] === '' ? '' : Number(row[key]);
    for (const key of ['looks_breakdown', 'other_breakdown']) row[key] = row[key] ? JSON.parse(row[key]) : null;
    return row;
  });
}
export function previewImport(rows, existing) {
  if (!rows.length || rows.length > 5000) throw new Error('取り込み件数は1〜5000件にしてください。');
  const byId = new Map(existing.map(row => [idOf(row), row]));
  const seenIds = new Set(), seenNames = new Set();
  return rows.map((input, index) => {
    try {
      const row = validateCharacter({...input, character_name: String(input.character_name ?? '').trim(), title_name: String(input.title_name ?? '').trim()});
      if (!row.title_name) throw new Error('作品名を指定してください。');
      row.registered_year = row.registered_year === '' || row.registered_year == null ? null : Number(row.registered_year);
      if (row.character_id && !/^\d+$/.test(String(row.character_id))) throw new Error('キャラクターIDが不正です。');
      const identity = `${normalize(row.title_name)}\u0000${normalize(row.character_name)}`;
      if (seenNames.has(identity)) throw new Error('ファイル内で作品とキャラクター名が重複しています。');
      seenNames.add(identity);
      const matched = row.character_id ? byId.get(String(row.character_id)) : existing.find(c => normalize(c.title_name) === normalize(row.title_name) && normalize(c.character_name) === normalize(row.character_name));
      if (row.character_id && !matched) throw new Error('指定IDが現在のデータにありません。新規登録する場合はID列を空にしてください。');
      if (matched?.deleted_at) throw new Error('ごみ箱にあるキャラクターです。先に復元してください。');
      if (matched && seenIds.has(idOf(matched))) throw new Error('同じキャラクターを複数回更新する行があります。');
      if (matched) seenIds.add(idOf(matched));
      const conflict = existing.find(c => !c.deleted_at && normalize(c.title_name) === normalize(row.title_name) && normalize(c.character_name) === normalize(row.character_name) && (!matched || idOf(c) !== idOf(matched)));
      if (conflict) throw new Error('同じ作品・名前の別キャラクターが登録されています。');
      return { line: index + 2, action: matched ? 'update' : 'create', before: matched, row: {...row, character_id: matched?.character_id ?? matched?.id ?? null, expected_revision: matched?.revision ?? null} };
    } catch (error) { return {line: index+2, action: 'error', row: input, error: error.message}; }
  });
}
export function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

