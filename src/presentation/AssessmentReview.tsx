import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {usePresentationSync} from './usePresentationSync';
import './presentation-interactions.css';

export function AssessmentReview({id,readonly,onClose,children}:{id:string;readonly:boolean;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 const [scroll,setScroll]=usePresentationSync(`assessment:${id}:scroll`,()=>0,(v):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1);
 useEffect(()=>{const origin=document.activeElement as HTMLElement|null;const node=ref.current;node?.showModal();return()=>{node?.close();requestAnimationFrame(()=>origin?.isConnected&&origin.focus())}},[]);
 useEffect(()=>{if(!readonly||!ref.current)return;const node=ref.current;node.scrollTop=scroll*Math.max(0,node.scrollHeight-node.clientHeight)},[readonly,scroll]);
 return createPortal(<dialog className="task-review-dialog assessment-review-dialog" ref={ref} aria-label="Разбор ответа" onCancel={e=>{e.preventDefault();if(!readonly)onClose()}} onScroll={e=>{if(!readonly){const n=e.currentTarget;setScroll(n.scrollHeight>n.clientHeight?n.scrollTop/(n.scrollHeight-n.clientHeight):0)}}}>
  <header><h2>Разбор ответа</h2>{!readonly&&<button type="button" onClick={onClose}>Закрыть разбор</button>}</header><div className="assessment-review-content">{children}</div>
 </dialog>,document.body);
}
