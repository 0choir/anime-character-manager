'use client';
import { useState } from 'react';
import { Avatar,Badge,Field,Modal,Status } from './ui';
import { SCORE_FIELDS,BREAKDOWNS,formatDate,signed,sumScores } from '@/lib/rating.mjs';

export default function CharacterDetail({character,isAdmin,history,historyLoading,historyError,onClose,onEdit,onDelete,onImage,busy}) {
  const [deleting,setDeleting]=useState(false),[reason,setReason]=useState(''),[error,setError]=useState('');
  const [historyPage,setHistoryPage]=useState(1);
  async function upload(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;setError('');try{await onImage(character,file);}catch(err){setError(err.message);}}
  async function remove(){setError('');try{await onDelete(character,reason);}catch(err){setError(err.message);}}
  return <Modal title={character.character_name} onClose={onClose} busy={busy} wide>
    <div className="stack">
      <div className="detail-heading"><Avatar row={character} size={100}/><div><p className="eyebrow">{character.title_name}</p><p>{character.voice_actor_name?`CV: ${character.voice_actor_name}`:'声優未設定'}{character.registered_year?` · ${character.registered_year}年登録`:''}</p><div className="badges"><Badge>{character.current_rank}位</Badge><Badge>{character.title_honor}</Badge><Badge>{character.tier_name}</Badge></div></div><div className="detail-total">{character.total_score}<small>/ 500点</small></div></div>
      <div className="score-bars">{SCORE_FIELDS.map(({key,label,color})=><div key={key}><div className="score-label"><span>{label}</span><strong>{character[key]}点</strong></div><div className="bar-track"><span style={{width:`${character[key]}%`,background:color}}/></div></div>)}</div>
      {Object.entries(BREAKDOWNS).map(([key,config])=>character[key]?<details key={key}><summary>{SCORE_FIELDS.find(f=>f.key===config.score)?.label}の保存済み内訳</summary><div className="detail-values">{config.fields.map(([field,label,max])=><span key={field}>{label}: {character[key][field]} / {max}</span>)}</div></details>:null)}
      {isAdmin?<>
        <div className="toolbar"><button className="button primary" onClick={()=>onEdit(character)} disabled={busy}>採点・情報を編集</button><label className={`button subtle ${busy?'disabled':''}`}>画像を変更<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/></label><button className="button danger" disabled={busy} onClick={()=>setDeleting(!deleting)}>ごみ箱へ移動</button></div>
        {deleting?<div className="notice warning stack"><p>「{character.character_name}」をランキングから外します。ごみ箱から復元できます。</p><Field label="理由（任意）"><input maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></Field><button className="button danger" disabled={busy} onClick={remove}>ごみ箱への移動を確定</button></div>:null}
        <div className="section-heading"><h3>採点・変更履歴</h3><span className="muted">理由は管理者のみ閲覧できます</span></div>
        <Status loading={historyLoading} error={historyError}>
        {!history.length?<p className="empty">履歴は今回の機能導入後の変更から記録されます。</p>:history.slice(0,historyPage*15).map(entry=>{
          const deltas=SCORE_FIELDS.filter(f=>entry.old_data&&Number(entry.new_data?.[f.key])!==Number(entry.old_data?.[f.key]));
          return <article className="history-entry" key={entry.id}><div className="section-heading"><strong>{{create:'新規登録',update:'採点・情報の更新',delete:'ごみ箱へ移動',restore:'復元',image:'画像変更'}[entry.change_type]}</strong><time>{formatDate(entry.changed_at)}</time></div>
            {deltas.length?<div className="detail-values">{deltas.map(f=><span key={f.key}>{f.label}: {entry.old_data[f.key]} → {entry.new_data[f.key]}（{signed(entry.new_data[f.key]-entry.old_data[f.key])}）</span>)}<b>合計差 {signed(sumScores(entry.new_data)-sumScores(entry.old_data))}点</b></div>:null}
            {entry.old_data?['character_name','title_name','voice_actor_name','registered_year'].filter(key=>entry.old_data[key]!==entry.new_data?.[key]).map(key=><p key={key}>{{character_name:'名前',title_name:'作品',voice_actor_name:'声優',registered_year:'登録年'}[key]}: {entry.old_data[key]??'未設定'} → {entry.new_data?.[key]??'未設定'}</p>):null}
            <p className="preserve-lines">{entry.reason||'理由の記録なし'}</p></article>;
        })}
        {history.length>historyPage*15?<button className="button subtle" onClick={()=>setHistoryPage(p=>p+1)}>さらに履歴を表示</button>:null}
        </Status>
      </>:null}
      {error?<p className="notice error" role="alert">{error}</p>:null}
    </div>
  </Modal>;
}

