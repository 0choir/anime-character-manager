'use client';
import { useState } from 'react';
import { Modal,Field } from './ui';
import { readImport,previewImport } from '@/lib/csv.mjs';
import { SCORE_FIELDS,signed } from '@/lib/rating.mjs';

export default function ImportDialog({existing,onClose,onImport,busy}) {
  const [preview,setPreview]=useState([]),[error,setError]=useState(''),[filename,setFilename]=useState(''),[reason,setReason]=useState('');
  const errors=preview.filter(r=>r.error),updates=preview.filter(r=>r.action==='update'),creates=preview.filter(r=>r.action==='create');
  async function choose(event) {
    const file=event.target.files?.[0];if(!file)return;
    setError('');setPreview([]);setFilename(file.name);
    try {
      if(file.size>10*1024*1024)throw new Error('ファイルは10MB以下にしてください。');
      setPreview(previewImport(readImport(await file.text(),file.name),existing));
    }catch(err){setError(err.message);}
  }
  async function submit(event) {
    event.preventDefault();setError('');
    try{await onImport(preview.map(item=>item.row),reason);}catch(err){setError(err.message);}
  }
  return <Modal title="CSV・バックアップから取り込み" onClose={onClose} busy={busy} wide>
    <form onSubmit={submit} className="stack">
      <p className="muted">UTF-8のCSV、またはこのアプリのバックアップJSONを選択してください。保存前に新規登録と更新内容を確認できます。</p>
      <p className="muted">ID列がある行はIDで照合し、ID列が空の行は作品と名前で照合します。JSONからは現行キャラクターを取り込みます。ごみ箱・履歴・過去点数表もJSONに保管されますが、この操作の取り込み対象は現行キャラクターです。</p>
      <Field label="ファイルを選択"><input type="file" accept=".csv,.json,text/csv,application/json" disabled={busy} onChange={choose}/></Field>
      {preview.length?<><div className="notice">{filename}：新規 {creates.length}件 / 更新 {updates.length}件 / エラー {errors.length}件</div>
        <div className="import-preview table-wrap"><table><thead><tr><th>行</th><th>処理</th><th>キャラクター / 作品</th><th>変更内容</th></tr></thead><tbody>{preview.map(item=><tr key={item.line}><td>{item.line}</td><td>{item.error?'要修正':item.action==='update'?'更新':'新規'}</td><td>{item.row.character_name}<small>{item.row.title_name}</small></td><td>{item.error?<span className="negative">{item.error}</span>:<div className="detail-values">{SCORE_FIELDS.map(f=><span key={f.key}>{f.label}: {item.before?`${item.before[f.key]} → `:''}{item.row[f.key]}{item.before?` (${signed(item.row[f.key]-item.before[f.key])})`:''}</span>)}{item.before?['character_name','title_name','voice_actor_name','registered_year','looks_breakdown','other_breakdown'].filter(key=>JSON.stringify(item.before[key]??null)!==JSON.stringify(item.row[key]??null)).map(key=><span key={key}>{{character_name:'名前',title_name:'作品',voice_actor_name:'声優',registered_year:'登録年',looks_breakdown:'ルックス内訳',other_breakdown:'その他内訳'}[key]}: {typeof item.before[key]==='object'?JSON.stringify(item.before[key]):item.before[key]||'未設定'} → {typeof item.row[key]==='object'?JSON.stringify(item.row[key]):item.row[key]||'未設定'}</span>):null}</div>}</td></tr>)}</tbody></table></div>
        <Field label="取り込みの理由（任意）"><input maxLength={2000} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></Field>
        <p className="muted">全件をまとめて保存します。1件でも失敗した場合はすべて取り消されます。同時に更新されたデータは、再確認が必要になります。</p>
      </>:null}
      {error?<div className="notice error" role="alert">{error}</div>:null}
      <button className="button primary" disabled={busy||!preview.length||errors.length>0}>{busy?'取り込んでいます…':`${creates.length+updates.length}件の取り込みを確定`}</button>
    </form>
  </Modal>;
}

