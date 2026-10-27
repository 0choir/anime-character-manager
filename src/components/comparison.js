'use client';
import { SCORE_FIELDS,compareSnapshots,signed,idOf,filterRankings } from '@/lib/rating.mjs';
import { useMemo,useState } from 'react';
import { Field } from './ui';
const COLORS=['#2563eb','#dc4890','#169d7b','#b08220'];
export function CharacterComparison({characters,onRemove}) {
  if(!characters.length)return <div className="empty">ランキングの「比較」にチェックを入れてください。最大4人を比較できます。</div>;
  const center=150,radius=95;
  const point=(i,scale)=>[center+Math.sin(i*2*Math.PI/5)*radius*scale,center-Math.cos(i*2*Math.PI/5)*radius*scale];
  return <div className="comparison-grid">
    <svg viewBox="0 0 300 300" className="radar" role="img" aria-label="5項目の採点比較レーダーチャート">
      {[.25,.5,.75,1].map(scale=><polygon key={scale} points={SCORE_FIELDS.map((_,i)=>point(i,scale).join(',')).join(' ')} fill="none" stroke="#dce3ed"/>)}
      {SCORE_FIELDS.map((f,i)=><g key={f.key}><line x1={center} y1={center} x2={point(i,1)[0]} y2={point(i,1)[1]} stroke="#dce3ed"/><text x={point(i,1.34)[0]} y={point(i,1.23)[1]} textAnchor="middle" fontSize="10" fill="#506077">{f.label}</text></g>)}
      {characters.map((row,index)=><polygon key={idOf(row)} points={SCORE_FIELDS.map((f,i)=>point(i,Number(row[f.key])/100).join(',')).join(' ')} fill={COLORS[index]} fillOpacity=".09" stroke={COLORS[index]} strokeWidth="2"/>)}
    </svg>
    <div className="table-wrap"><table><caption>採点比較（各項目100点満点）</caption><thead><tr><th>項目</th>{characters.map((row,i)=><th key={idOf(row)} style={{color:COLORS[i]}}>{row.character_name}<button className="text-button" onClick={()=>onRemove(idOf(row))}>比較から外す</button></th>)}</tr></thead><tbody>{[...SCORE_FIELDS,{key:'total_score',label:'合計'}].map(f=><tr key={f.key}><th>{f.label}</th>{characters.map(row=><td key={idOf(row)}>{row[f.key]}</td>)}</tr>)}</tbody></table></div>
  </div>;
}
export function SnapshotComparison({current,previous,currentLabel,previousLabel}) {
  const [query,setQuery]=useState(''); const [kind,setKind]=useState('all');
  const all=useMemo(()=>compareSnapshots(current,previous),[current,previous]);
  const rows=filterRankings(all,{query}).filter(row=>kind==='all'||row.status===kind||(kind==='changed'&&row.status==='matched'&&(row.score_delta!==0||row.rank_delta!==0)));
  const [page,setPage]=useState(1); const pages=Math.max(1,Math.ceil(rows.length/25));const active=Math.min(page,pages);
  return <div className="stack">
    <p className="muted">{previousLabel}（{previous.length}件）→ {currentLabel}（{current.length}件）。点数差と順位差を別々に表示します。追加・削除だけでも順位は変わります。</p>
    {all.some(r=>r.status==='ambiguous')?<div className="notice warning">同じIDが複数ある履歴があります。「照合要確認」は増減計算の対象外です。</div>:null}
    <div className="toolbar"><Field label="比較対象を検索"><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="キャラ名・作品・声優"/></Field><Field label="表示対象"><select value={kind} onChange={e=>{setKind(e.target.value);setPage(1);}}><option value="all">すべて</option><option value="changed">点数・順位に変化あり</option><option value="new">新規</option><option value="removed">今回の表に不在</option><option value="ambiguous">照合要確認</option></select></Field></div>
    <div className="table-wrap"><table><thead><tr><th>キャラクター</th><th>状態</th><th>合計点</th><th>点数差</th><th>順位</th><th>順位差</th>{SCORE_FIELDS.map(f=><th key={f.key}>{f.label}差</th>)}</tr></thead><tbody>
      {rows.slice((active-1)*25,active*25).map(row=><tr key={idOf(row)}><td><strong>{row.character_name}</strong><small>{row.title_name}</small></td><td>{{new:'新規',removed:'今回の表に不在',matched:'継続',ambiguous:'照合要確認'}[row.status]}</td><td>{row.status==='ambiguous'?'—':`${row.previous?.total_score??'—'} → ${row.current?.total_score??'—'}`}</td><td className={row.score_delta>0?'positive':row.score_delta<0?'negative':''}>{row.score_delta==null?'—':`${signed(row.score_delta)}点`}</td><td>{row.status==='ambiguous'?'—':`${row.previous?.current_rank??'—'} → ${row.current?.current_rank??'—'}`}</td><td>{row.rank_delta==null?'—':row.rank_delta>0?`↑${row.rank_delta}`:row.rank_delta<0?`↓${-row.rank_delta}`:'±0'}</td>{SCORE_FIELDS.map(f=><td key={f.key}>{row.deltas?signed(row.deltas[f.key]):'—'}</td>)}</tr>)}
    </tbody></table></div>
    {!rows.length?<div className="empty">比較対象がありません。</div>:<div className="pagination"><span>{rows.length}件</span><div><button className="button subtle" disabled={active===1} onClick={()=>setPage(active-1)}>前へ</button><span>{active} / {pages}</span><button className="button subtle" disabled={active===pages} onClick={()=>setPage(active+1)}>次へ</button></div></div>}
  </div>;
}

