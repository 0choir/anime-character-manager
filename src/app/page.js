'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import { requireSupabase,supabase } from '@/lib/supabase';
import { rpc,createBackup } from '@/lib/api';
import { useAuth,useDashboard,useSnapshot,useAdminData } from '@/hooks/use-rating-data';
import { filterRankings,idOf,japanDate,formatDate } from '@/lib/rating.mjs';
import { downloadFile,toCSV } from '@/lib/csv.mjs';
import RankingTable,{RankingFilters} from '@/components/ranking-table';
import CharacterForm from '@/components/character-form';
import CharacterDetail from '@/components/character-detail';
import AuthDialog from '@/components/auth-dialog';
import ImportDialog from '@/components/import-dialog';
import AdminPanel from '@/components/admin-panel';
import Statistics from '@/components/statistics';
import { CharacterComparison,SnapshotComparison } from '@/components/comparison';
import { Field,Status } from '@/components/ui';

const EMPTY=[];
const TABS=[['current','ランキング'],['history','過去の点数表'],['changes','過去との比較'],['compare','キャラクター比較'],['stats','集計']];

export default function Home() {
  const [version,setVersion]=useState(0),[tab,setTab]=useState('current'),[filters,setFilters]=useState({});
  const [snapshot,setSnapshot]=useState(''),[baseSnapshot,setBaseSnapshot]=useState(''),[targetSnapshot,setTargetSnapshot]=useState('current');
  const [compareIds,setCompareIds]=useState([]),[selectedId,setSelectedId]=useState(null),[form,setForm]=useState(null);
  const [login,setLogin]=useState(null),[importOpen,setImportOpen]=useState(false),[notice,setNotice]=useState(null),[busy,setBusy]=useState(false),[backupBusy,setBackupBusy]=useState(false);
  const locked=useRef(false),backupLock=useRef(false);
  const auth=useAuth(),dashboard=useDashboard(version),admin=useAdminData(auth.isAdmin,version);
  const characters=dashboard.data?.characters||EMPTY,snapshots=dashboard.data?.snapshots||EMPTY;
  const selectedSnapshot=snapshot||snapshots[0]?.snapshot_name||'';
  const base=baseSnapshot||snapshots[0]?.snapshot_name||'';
  const historical=useSnapshot(tab==='history'?selectedSnapshot:'',version);
  const previous=useSnapshot(tab==='changes'?base:'',version);
  const target=useSnapshot(tab==='changes'&&targetSnapshot!=='current'?targetSnapshot:'',version);
  const source=tab==='history'?historical.data:characters;
  const visible=useMemo(()=>filterRankings(source,filters),[source,filters]);
  const selected=characters.find(c=>idOf(c)===selectedId);
  const comparison=characters.filter(c=>compareIds.includes(idOf(c)));
  useEffect(()=>{
    if(!supabase)return;
    const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setLogin('recovery');});
    return ()=>subscription.unsubscribe();
  },[]);
  async function mutate(task,message) {
    if(locked.current)throw new Error('保存処理が完了するまでお待ちください。');
    locked.current=true;setBusy(true);setNotice(null);
    try{const result=await task();setVersion(v=>v+1);setNotice({type:'success',text:typeof message==='function'?message(result):message});return result;}
    finally{locked.current=false;setBusy(false);}
  }
  const report=error=>setNotice({type:'error',text:error.message});
  function toggleCompare(id){setCompareIds(old=>old.includes(id)?old.filter(v=>v!==id):old.length<4?[...old,id]:old);}
  function changeTab(next){setTab(next);setFilters({});}
  async function saveCharacter(payload,expectedRevision,reason){await mutate(()=>rpc('rating_save_character',{payload,expected_revision:expectedRevision,reason}),'キャラクターを保存しました。');setForm(null);}
  async function removeCharacter(character,reason){await mutate(()=>rpc('rating_set_deleted',{character_id:character.character_id,expected_revision:character.revision,restore:false,reason}),'ごみ箱へ移動しました。管理画面から復元できます。');setSelectedId(null);}
  async function setImage(character,file) {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('画像はJPEG・PNG・WebP形式、5MB以下にしてください。');
    await mutate(async()=>{
      const client=requireSupabase(),extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
      const path='c_'+character.character_id+'/'+crypto.randomUUID()+'.'+extension;
      const {error}=await client.storage.from('character-images').upload(path,file,{contentType:file.type,upsert:false});
      if(error)throw error;
      const {data:{publicUrl}}=client.storage.from('character-images').getPublicUrl(path);
      try{await rpc('rating_set_image',{character_id:character.character_id,expected_revision:character.revision,image_url:publicUrl});}
      catch(err){await client.storage.from('character-images').remove([path]);throw err;}
    },'画像を変更しました。');
  }
  function exportCSV(rows,label){try{if(!rows.length)throw new Error('出力するデータがありません。');downloadFile(toCSV(rows),label+'_'+japanDate()+'.csv','text/csv;charset=utf-8');}catch(error){report(error);}}
  async function backup(){if(backupLock.current)return;backupLock.current=true;setBackupBusy(true);try{downloadFile(JSON.stringify(await createBackup(),null,2),'アニメキャラ採点バックアップ_'+japanDate()+'.json','application/json');setNotice({type:'success',text:'バックアップを作成しました。'});}catch(error){report(error);}finally{backupLock.current=false;setBackupBusy(false);}}
  async function signOut(){try{const {error}=await requireSupabase().auth.signOut();if(error)throw error;setForm(null);setImportOpen(false);setSelectedId(null);if(tab==='admin')setTab('current');}catch(error){report(error);}}
  const importExisting=useMemo(()=>{
    if(!admin.data||!dashboard.data)return EMPTY;
    const titles=new Map(dashboard.data.titles.map(t=>[String(t.id),t.name]));const voices=new Map(dashboard.data.voiceActors.map(v=>[String(v.id),v.name]));
    return admin.data.allCharacters.map(c=>({...c,title_name:titles.get(String(c.title_id)),voice_actor_name:voices.get(String(c.voice_actor_id))||''}));
  },[admin.data,dashboard.data]);
  return <main className="app-shell">
    <header className="app-header"><div><p className="eyebrow">CHARACTER SCORE ARCHIVE</p><h1>アニメキャラ採点管理</h1><p className="muted">採点を残す。変化を見つける。</p></div><div className="header-actions">{auth.loading?<span className="muted">ログイン確認中…</span>:auth.user?<><span className="session-label">{auth.isAdmin?'管理者':'閲覧アカウント'}<small>{auth.user.email}</small></span><button className="button subtle" onClick={signOut} disabled={busy}>ログアウト</button></>:<button className="button subtle" disabled={!supabase} onClick={()=>setLogin('login')}>管理者ログイン</button>}<button className="button subtle" disabled={dashboard.loading||busy} onClick={()=>setVersion(v=>v+1)}>再読み込み</button></div></header>
    {auth.error?<div className="notice error" role="alert">ログイン確認: {auth.error}</div>:null}
    {auth.user&&!auth.isAdmin&&!auth.loading&&!auth.error?<div className="notice warning">このアカウントには管理者権限がありません。管理者として登録されたメールアドレスを確認してください。</div>:null}
    {notice?<div className={'notice '+notice.type} role={notice.type==='error'?'alert':'status'}><span>{notice.text}</span><button className="text-button" aria-label="通知を閉じる" onClick={()=>setNotice(null)}>×</button></div>:null}
    <nav className="tabs" aria-label="機能">{[...TABS,...(auth.isAdmin?[['admin','管理']]:[])].map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} className={tab===key?'active':''} onClick={()=>changeTab(key)}>{label}{key==='compare'&&comparison.length?' ('+comparison.length+')':''}</button>)}</nav>
    <Status loading={dashboard.loading} error={dashboard.error}>
      {tab==='current'||tab==='history'?<section className="panel stack">
        <div className="section-heading"><div><h2>{tab==='current'?'総合ランキング':'過去の点数表'}</h2><p className="muted">{tab==='current'?characters.length+'人の採点を記録しています。':'点数・名前・作品は保存当時の情報です。登録年など、当時未記録の項目は空欄になります。'}</p></div><div className="toolbar">{auth.isAdmin&&tab==='current'?<button className="button primary" disabled={busy} onClick={()=>setForm({character:null})}>＋ 登録する</button>:null}<button className="button subtle" disabled={!source.length||(tab==='history'&&historical.loading)} onClick={()=>exportCSV(source,tab==='current'?'アニメキャラランキング':'過去点数表_'+selectedSnapshot)}>全件CSV</button></div></div>
        {tab==='history'?<Field label="点数表を選択"><select value={selectedSnapshot} onChange={e=>{setSnapshot(e.target.value);setFilters({});}}><option value="" disabled>点数表を選択</option>{snapshots.map(s=><option key={s.snapshot_name} value={s.snapshot_name}>{s.snapshot_name}（{s.character_count}件）</option>)}</select></Field>:null}
        <RankingFilters rows={source} value={filters} onChange={setFilters}/>
        <div className="section-heading"><span className="muted">{visible.length}件が該当</span><button className="text-button" disabled={!visible.length} onClick={()=>exportCSV(visible,'絞り込み結果')}>絞り込み結果をCSV保存</button></div>
        <Status loading={tab==='history'&&historical.loading} error={tab==='history'?historical.error:''} empty={tab==='history'&&!selectedSnapshot}><RankingTable key={tab+':'+selectedSnapshot+':'+JSON.stringify(filters)} rows={visible} onSelect={tab==='current'?row=>setSelectedId(idOf(row)):undefined} compareIds={compareIds} onCompare={tab==='current'?toggleCompare:undefined}/></Status>
        {tab==='current'&&comparison.length?<div className="compare-tray"><span>{comparison.map(c=>c.character_name).join(' / ')}</span><button className="button primary" onClick={()=>changeTab('compare')}>選んだ{comparison.length}人を比較</button><button className="text-button" onClick={()=>setCompareIds([])}>選択を解除</button></div>:null}
      </section>:null}
      {tab==='changes'?<section className="panel stack"><h2>過去との比較</h2><div className="grid-two"><Field label="比較元"><select value={base} onChange={e=>setBaseSnapshot(e.target.value)}><option value="" disabled>点数表を選択</option>{snapshots.map(s=><option key={s.snapshot_name} value={s.snapshot_name}>{s.snapshot_name}</option>)}</select></Field><Field label="比較先"><select value={targetSnapshot} onChange={e=>setTargetSnapshot(e.target.value)}><option value="current">現在のランキング</option>{snapshots.map(s=><option key={s.snapshot_name} value={s.snapshot_name}>{s.snapshot_name}</option>)}</select></Field></div><Status loading={previous.loading||target.loading} error={previous.error||target.error} empty={!base}><SnapshotComparison key={base+':'+targetSnapshot} current={targetSnapshot==='current'?characters:target.data} previous={previous.data} currentLabel={targetSnapshot==='current'?'現在のランキング':targetSnapshot} previousLabel={base}/></Status></section>:null}
      {tab==='compare'?<section className="panel stack"><h2>キャラクター比較</h2><p className="muted">ランキングから最大4人まで選択できます。比較用の数値は現在の採点です。</p><CharacterComparison characters={comparison} onRemove={toggleCompare}/><button className="button subtle" onClick={()=>changeTab('current')}>ランキングで選ぶ</button></section>:null}
      {tab==='stats'?<section className="panel stack"><h2>作品・声優ごとの集計</h2><Statistics rows={characters}/></section>:null}
      {tab==='admin'&&auth.isAdmin?<section className="panel stack"><h2>管理</h2><AdminPanel adminData={admin} busy={busy} backupBusy={backupBusy} onNew={()=>setForm({character:null})} onMaster={(kind,master_name)=>mutate(()=>rpc('rating_add_master',{kind,master_name}),'マスタを登録しました。同名の登録がある場合は既存データを使用します。')} onSnapshot={async snapshot_name=>{await mutate(()=>rpc('rating_take_snapshot',{snapshot_name}),count=>count+'人の点数表を保存しました。');setSnapshot(snapshot_name.trim());}} onRestore={c=>mutate(()=>rpc('rating_set_deleted',{character_id:c.character_id,expected_revision:c.revision,restore:true,reason:'ごみ箱から復元'}),'キャラクターを復元しました。')} onBackup={backup} onImport={()=>setImportOpen(true)}/></section>:null}
    </Status>
    <footer className="app-footer">5項目・500点満点 <span>更新後は再読み込みで最新の状態を確認できます。</span>{snapshots[0]?<small>最新の点数表: {snapshots[0].snapshot_name} · {formatDate(snapshots[0].recorded_at)}</small>:null}</footer>
    {login?<AuthDialog recovery={login==='recovery'} onClose={()=>setLogin(null)}/>:null}
    {selected&&!form?<CharacterDetail key={selectedId} character={selected} isAdmin={auth.isAdmin} history={(admin.data?.history||EMPTY).filter(h=>String(h.character_id)===selectedId)} historyLoading={admin.loading} historyError={admin.error} onClose={()=>setSelectedId(null)} onEdit={character=>setForm({character})} onDelete={removeCharacter} onImage={setImage} busy={busy}/>:null}
    {form&&auth.isAdmin?<CharacterForm character={form.character} titles={dashboard.data?.titles||EMPTY} voiceActors={dashboard.data?.voiceActors||EMPTY} onClose={()=>setForm(null)} onSave={saveCharacter} busy={busy}/>:null}
    {importOpen&&auth.isAdmin?<ImportDialog existing={importExisting} busy={busy} onClose={()=>setImportOpen(false)} onImport={async(rows,reason)=>{await mutate(()=>rpc('rating_import_characters',{rows,reason}),count=>count+'件を取り込みました。');setImportOpen(false);}}/>:null}
  </main>;
}

