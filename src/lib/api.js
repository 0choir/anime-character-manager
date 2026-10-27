import { requireSupabase } from './supabase.js';

// Stable unique ordering and an exact count prevent silent truncation of large exports.
export async function fetchAll(table, { orders = ['id'], filter, signal, columns = '*' } = {}) {
  const client = requireSupabase();
  const rows = []; const size = 200; let expected;
  while (true) {
    let query = client.from(table).select(columns, {count: 'exact'});
    if (filter) query = filter(query);
    for (const order of orders) query = typeof order === 'string' ? query.order(order) : query.order(order.key, {ascending: order.ascending});
    query = query.range(rows.length, rows.length + size - 1);
    if (signal) query = query.abortSignal(signal);
    const {data, error, count} = await query;
    if (error) throw new Error(error.message);
    if (count == null) throw new Error('データ件数を確認できませんでした。再読み込みしてください。');
    if (expected != null && count !== expected) throw new Error('読み込み中にデータ件数が変わりました。再読み込みしてください。');
    expected = count;
    rows.push(...(data || []));
    if (rows.length >= count) break;
    if (!data?.length) throw new Error('データの全件取得に失敗しました。再読み込みしてください。');
  }
  return rows;
}
export async function fetchDashboard(signal) {
  const [characters, titles, voiceActors, snapshots] = await Promise.all([
    fetchAll('rating_characters', {orders: ['current_rank','character_id'], signal}),
    fetchAll('titles', {orders: ['name','id'], signal}),
    fetchAll('voice_actors', {orders: ['name','id'], signal}),
    fetchAll('rating_snapshot_list', {orders: [{key:'recorded_at',ascending:false},'snapshot_name'], signal}),
  ]);
  return {characters, titles, voiceActors, snapshots};
}
export function fetchSnapshot(name, signal) {
  return fetchAll('v2_snapshot_export', {orders:['current_rank','snapshot_row_id'], filter:q=>q.eq('snapshot_name', name),signal});
}
export async function rpc(name, args) {
  const {data,error} = await requireSupabase().rpc(name,args);
  if (error) {
    if (error.code === '23505') throw new Error('同じ作品・キャラクター名がすでに登録されています。');
    throw new Error(error.message);
  }
  return data;
}
export async function fetchAdminData(signal) {
  const [characters,scores,history] = await Promise.all([
    fetchAll('characters_v2',{signal}),fetchAll('scores',{signal}),
    fetchAll('rating_change_history',{orders:[{key:'changed_at',ascending:false},{key:'id',ascending:false}],signal}),
  ]);
  const scoreMap = new Map(scores.map(s=>[String(s.character_id),s]));
  return {allCharacters:characters.map(c=>({...scoreMap.get(String(c.id)),...c,character_id:c.id})),history};
}
export async function createBackup() {
  return rpc('rating_export_backup');
}

