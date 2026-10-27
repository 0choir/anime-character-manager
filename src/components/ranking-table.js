'use client';
import { useState } from 'react';
import { Avatar,Badge } from './ui';
import { SCORE_FIELDS,idOf,rowKey } from '@/lib/rating.mjs';

export function RankingFilters({rows,value,onChange}) {
  const options=key=>[...new Set(rows.map(r=>r[key]).filter(v=>v!=null&&v!==''))].sort((a,b)=>String(a).localeCompare(String(b),'ja'));
  const fields=[['title','作品','title_name'],['voice','声優','voice_actor_name'],['year','登録年','registered_year'],['tier','Tier','tier_name']];
  return <div className="filters">
    <label className="field search-field"><span>検索</span><input type="search" placeholder="キャラ名・作品・声優で検索" value={value.query||''} onChange={e=>onChange({...value,query:e.target.value})}/></label>
    {fields.map(([key,label,column])=><label className="field" key={key}><span>{label}</span><select value={value[key]||''} onChange={e=>onChange({...value,[key]:e.target.value})}><option value="">すべて</option>{options(column).map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}
    <label className="field"><span>並べ替え</span><select value={value.sort||'current_rank:asc'} onChange={e=>onChange({...value,sort:e.target.value})}><option value="current_rank:asc">総合順位順</option><option value="total_score:asc">合計点が低い順</option>{SCORE_FIELDS.map(f=><option key={f.key} value={`${f.key}:desc`}>{f.label}が高い順</option>)}<option value="registered_year:desc">登録年が新しい順</option><option value="character_name:asc">名前順</option></select></label>
    <button className="button subtle" onClick={()=>onChange({})}>条件をクリア</button>
  </div>;
}
export default function RankingTable({rows,onSelect,compareIds=[],onCompare}) {
  const [page,setPage]=useState(1); const size=25;
  const pages=Math.max(1,Math.ceil(rows.length/size)); const current=Math.min(page,pages);
  const visible=rows.slice((current-1)*size,current*size);
  if(!rows.length)return <div className="empty">条件に合うキャラクターがいません。</div>;
  return <>
    <div className="table-wrap"><table className="ranking-table"><thead><tr>{onCompare?<th>比較</th>:null}<th>順位</th><th>キャラクター / 作品</th><th>称号 / Tier</th><th>合計</th>{SCORE_FIELDS.map(f=><th key={f.key}>{f.label}</th>)}</tr></thead>
      <tbody>{visible.map(row=><tr key={rowKey(row)}>
        {onCompare?<td><input type="checkbox" aria-label={`${row.character_name}を比較`} checked={compareIds.includes(idOf(row))} disabled={!compareIds.includes(idOf(row))&&compareIds.length>=4} onChange={()=>onCompare(idOf(row))}/></td>:null}
        <td className="rank-number">{row.current_rank}</td>
        <td><div className="character-cell"><Avatar row={row}/><div>{onSelect?<button className="character-link" onClick={()=>onSelect(row)}>{row.character_name}</button>:<strong>{row.character_name}</strong>}<small>{row.title_name}</small><small>{row.voice_actor_name?`CV: ${row.voice_actor_name}`:'声優未設定'}{row.registered_year?` · ${row.registered_year}年`:''}</small></div></div></td>
        <td><div className="badges"><Badge>{row.title_honor}</Badge><Badge>{row.tier_name}</Badge></div></td>
        <td className="score-number">{row.total_score}</td>{SCORE_FIELDS.map(f=><td key={f.key}>{row[f.key]}</td>)}
      </tr>)}</tbody>
    </table></div>
    <div className="pagination"><span>{(current-1)*size+1}〜{Math.min(current*size,rows.length)} / {rows.length}件 <small>順位は全体順位です</small></span><div><button className="button subtle" disabled={current===1} onClick={()=>setPage(current-1)}>前へ</button><span>{current} / {pages}</span><button className="button subtle" disabled={current===pages} onClick={()=>setPage(current+1)}>次へ</button></div></div>
  </>;
}

