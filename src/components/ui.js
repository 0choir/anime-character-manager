'use client';
import { useEffect, useId, useRef } from 'react';
import Image from 'next/image';

export function Modal({title,children,onClose,busy=false,wide=false}) {
  const dialog=useRef(null); const titleId=useId();
  useEffect(()=>{const node=dialog.current;node.showModal();return()=>node.close();},[]);
  return <dialog ref={dialog} className={`modal ${wide?'modal-wide':''}`} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <div className="modal-heading"><h2 id={titleId}>{title}</h2><button type="button" className="button subtle" disabled={busy} onClick={onClose} aria-label="閉じる">閉じる ×</button></div>
    {children}
  </dialog>;
}
export function Field({label,children,hint}) {
  return <label className="field"><span>{label}</span>{children}{hint?<small>{hint}</small>:null}</label>;
}
export function Avatar({row,size=44}) {
  return <span className="avatar" style={{width:size,height:size}}>{row.image_url?<Image src={row.image_url} alt={`${row.character_name}の画像`} width={size} height={size} unoptimized />:String(row.character_name||'?').slice(0,1)}</span>;
}
export function Status({loading,error,empty,children}) {
  if(loading)return <div className="empty" role="status">データを読み込んでいます…</div>;
  if(error)return <div className="notice error" role="alert">{error}</div>;
  if(empty)return <div className="empty">該当するデータがありません。</div>;
  return children;
}
export function Badge({children}) {return children?<span className="badge">{children}</span>:null;}

