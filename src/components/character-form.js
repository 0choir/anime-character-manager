'use client';
import { useState } from 'react';
import { Modal,Field } from './ui';
import { BREAKDOWNS,SCORE_FIELDS,emptyCharacter,allocateBreakdown,sumScores,validateCharacter } from '@/lib/rating.mjs';

export default function CharacterForm({character,titles,voiceActors,onClose,onSave,busy}) {
  const [form,setForm]=useState(()=>({...emptyCharacter(),...character,reason:''}));
  const [expanded,setExpanded]=useState(()=>({looks_breakdown:Boolean(character?.looks_breakdown),other_breakdown:Boolean(character?.other_breakdown)}));
  const [error,setError]=useState('');
  const set=(key,value)=>setForm(old=>({...old,[key]:value}));
  function toggle(key) {
    const config=BREAKDOWNS[key];
    if(!expanded[key]&&!form[key])set(key,allocateBreakdown(form[config.score],config.fields));
    setExpanded(old=>({...old,[key]:!old[key]}));
  }
  function updateDetail(key,field,value) {
    setForm(old=>{const details={...old[key],[field]:Number(value)};return {...old,[key]:details,[BREAKDOWNS[key].score]:Object.values(details).reduce((a,b)=>a+Number(b),0)};});
  }
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      const payload={...form,character_id:character?.character_id??null,title_id:Number(form.title_id),voice_actor_id:form.voice_actor_id?Number(form.voice_actor_id):null,registered_year:form.registered_year===''?null:Number(form.registered_year),character_name:form.character_name.trim()};
      validateCharacter(payload);
      await onSave(payload,character?.revision??null,form.reason);
    } catch(err){setError(err.message);}
  }
  return <Modal title={character?'キャラクターを編集':'キャラクターを登録'} onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="stack">
      <fieldset disabled={busy} className="stack">
        <Field label="作品 *"><select required value={form.title_id??''} onChange={e=>set('title_id',e.target.value)}><option value="">作品を選択</option>{titles.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="キャラクター名 *"><input required maxLength={200} value={form.character_name} onChange={e=>set('character_name',e.target.value)} /></Field>
        <div className="grid-two">
          <Field label="担当声優"><select value={form.voice_actor_id??''} onChange={e=>set('voice_actor_id',e.target.value)}><option value="">未設定</option>{voiceActors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
          <Field label="登録年"><input type="number" min="1900" max="2200" value={form.registered_year??''} onChange={e=>set('registered_year',e.target.value)} /></Field>
        </div>
        <div className="score-editor stack">
          {SCORE_FIELDS.map(({key,label,color})=>{
            const detailKey=Object.keys(BREAKDOWNS).find(k=>BREAKDOWNS[k].score===key);
            return <div className="score-input" key={key}>
              <label className="score-label" htmlFor={key}><span>{label}</span><strong style={{color}}>{form[key]}点</strong></label>
              {!detailKey||!expanded[detailKey]?<input id={key} type="range" min="0" max="100" value={form[key]} style={{accentColor:color}} onChange={e=>setForm(old=>({...old,[key]:Number(e.target.value),...(detailKey?{[detailKey]:null}:{})}))}/>:null}
              {detailKey?<button type="button" className="text-button" onClick={()=>toggle(detailKey)}>{expanded[detailKey]?'内訳を閉じる':'内訳を細かく計算'}{form[detailKey]&&!expanded[detailKey]?'（保存済み内訳あり）':''}</button>:null}
              {detailKey&&expanded[detailKey]?<div className="breakdown stack"><small>未記録の内訳は合計を保つ仮配分です。内容を調整して保存してください。</small>{BREAKDOWNS[detailKey].fields.map(([field,name,max])=><label className="field" key={field}><span>{name} <b>{form[detailKey]?.[field]??0} / {max}</b></span><input type="range" min="0" max={max} value={form[detailKey]?.[field]??0} onChange={e=>updateDetail(detailKey,field,e.target.value)}/></label>)}</div>:null}
            </div>;
          })}
          <div className="total-score">合計 <strong>{sumScores(form)}</strong> / 500点</div>
        </div>
        <Field label="採点・変更の理由（管理者のみ閲覧）"><textarea rows={3} maxLength={2000} value={form.reason} onChange={e=>set('reason',e.target.value)} placeholder="再評価した理由や、作品を見た感想など" /></Field>
      </fieldset>
      {error?<div className="notice error" role="alert">{error}</div>:null}
      <button className="button primary full" disabled={busy}>{busy?'保存しています…':'保存する'}</button>
    </form>
  </Modal>;
}

