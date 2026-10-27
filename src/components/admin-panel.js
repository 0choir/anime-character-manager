'use client';
import { useState } from 'react';
import { Field,Status } from './ui';
import { formatDate } from '@/lib/rating.mjs';

export default function AdminPanel({adminData,onMaster,onSnapshot,onBackup,onImport,onRestore,onNew,busy,backupBusy}) {
  const [snapshotName,setSnapshotName]=useState(''),[title,setTitle]=useState(''),[voice,setVoice]=useState(''),[error,setError]=useState('');
  async function submit(event,task,reset) {event.preventDefault();setError('');try{await task();reset?.();}catch(err){setError(err.message);}}
  const deleted=adminData.data?.allCharacters.filter(c=>c.deleted_at)||[];
  return <div className="stack">
    <div className="toolbar"><button className="button primary" disabled={busy} onClick={onNew}>＋ キャラクターを登録</button><button className="button subtle" disabled={busy||adminData.loading||Boolean(adminData.error)} onClick={onImport}>CSV・JSON取り込み</button><button className="button subtle" disabled={backupBusy} onClick={onBackup}>{backupBusy?'バックアップ作成中…':'全データをJSON保存'}</button></div>
    <p className="muted">JSONバックアップには現行データ、ごみ箱、採点内訳、過去点数表、変更履歴を含みます。ログイン情報は含みません。</p>
    <div className="admin-grid">
      <form className="subpanel stack" onSubmit={e=>submit(e,()=>onSnapshot(snapshotName),()=>setSnapshotName(''))}><h3>現在の点数表を保存</h3><p className="muted">全員の点数・順位・称号・Tierを、現在の状態で保存します。</p><Field label="点数表の名前"><input required maxLength={100} value={snapshotName} onChange={e=>setSnapshotName(e.target.value)} placeholder="例：2026年秋・再評価後" disabled={busy}/></Field><button className="button primary" disabled={busy}>点数表を保存</button></form>
      <div className="subpanel stack"><form className="stack" onSubmit={e=>submit(e,()=>onMaster('title',title),()=>setTitle(''))}><Field label="作品マスタを追加"><input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/></Field><button className="button subtle" disabled={busy}>作品を追加</button></form><form className="stack" onSubmit={e=>submit(e,()=>onMaster('voice',voice),()=>setVoice(''))}><Field label="声優マスタを追加"><input required maxLength={200} value={voice} onChange={e=>setVoice(e.target.value)} disabled={busy}/></Field><button className="button subtle" disabled={busy}>声優を追加</button></form></div>
    </div>
    {error?<div className="notice error" role="alert">{error}</div>:null}
    <div className="section-heading"><h3>ごみ箱</h3><span className="muted">手動で復元するまで保持します</span></div>
    <Status loading={adminData.loading} error={adminData.error} empty={!deleted.length}>
      <div className="table-wrap"><table><thead><tr><th>キャラクター</th><th>移動日時</th><th>操作</th></tr></thead><tbody>{deleted.map(c=><tr key={c.id}><td>{c.character_name}</td><td>{formatDate(c.deleted_at)}</td><td><button className="button subtle" disabled={busy} onClick={()=>submit({preventDefault(){}},()=>onRestore(c))}>復元する</button></td></tr>)}</tbody></table></div>
    </Status>
  </div>;
}

