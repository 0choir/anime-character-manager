'use client';
import { useState,useMemo } from 'react';
import { aggregateRankings,SCORE_FIELDS } from '@/lib/rating.mjs';
import { Field } from './ui';

export default function Statistics({rows}) {
  const [field,setField]=useState('title_name'),[min,setMin]=useState(1),[query,setQuery]=useState('');
  const groups=useMemo(()=>aggregateRankings(rows,field).filter(g=>g.count>=min&&g.name.includes(query)),[rows,field,min,query]);
  const avg=rows.length?rows.reduce((s,r)=>s+Number(r.total_score),0)/rows.length:0;
  return <div className="stack">
    <div className="stat-cards"><div><small>登録キャラクター</small><strong>{rows.length}<span>人</span></strong></div><div><small>全体の平均点</small><strong>{avg.toFixed(1)}<span>/ 500</span></strong></div><div><small>登録作品</small><strong>{new Set(rows.map(r=>r.title_id)).size}<span>作品</span></strong></div></div>
    <div className="toolbar"><Field label="集計単位"><select value={field} onChange={e=>setField(e.target.value)}><option value="title_name">作品別</option><option value="voice_actor_name">声優別</option></select></Field><Field label="最低登録人数"><input type="number" min="1" max="10000" value={min} onChange={e=>setMin(Math.max(1,Number(e.target.value)||1))}/></Field><Field label="名前で検索"><input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></Field></div>
    <p className="muted">登録済みキャラクターだけの集計です。声優未設定は声優別集計から除外します。平均点は登録人数と合わせて確認してください。</p>
    <div className="table-wrap"><table><thead><tr><th>{field==='title_name'?'作品':'声優'}</th><th>人数</th><th>平均点</th><th>最高点</th><th>最高点のキャラクター</th></tr></thead><tbody>{groups.map(g=><tr key={g.name}><td>{g.name}</td><td>{g.count}</td><td>{g.average.toFixed(1)}</td><td>{g.best.total_score}</td><td>{g.best.character_name}</td></tr>)}</tbody></table></div>
    <div className="score-bars"><h3>全体の項目別平均</h3>{SCORE_FIELDS.map(f=>{const score=rows.length?rows.reduce((s,r)=>s+Number(r[f.key]),0)/rows.length:0;return <div key={f.key}><div className="score-label"><span>{f.label}</span><b>{score.toFixed(1)}点</b></div><div className="bar-track"><span style={{width:`${score}%`,background:f.color}}/></div></div>;})}</div>
  </div>;
}

