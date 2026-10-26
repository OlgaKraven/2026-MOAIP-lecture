import {createContext,useContext,useEffect,useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import type {Visual} from './model'
import {InfographicMobile} from './InfographicMobile'
import {ReadableDiagram,diagramSteps} from './ReadableDiagram'
import {Modal} from './Modal'
export type DiagramView='diagram'|'text'|null
export const DiagramControl=createContext<{view:DiagramView;setView:(view:DiagramView)=>void}|null>(null)
export function Infographic({visual,base='/',slideId,interactive=true}:{visual:Visual;base?:string;slideId?:string;interactive?:boolean}){
  const id=useId()
  const [localView,setLocalView]=useState<DiagramView>(null)
  const [step,setStep]=useState(0),stepRef=useRef(0),sequence=useRef(0)
  stepRef.current=step
  const control=useContext(DiagramControl),view=control?control.view:localView,setView=control?control.setView:setLocalView
  const params=new URLSearchParams(location.search),mode=params.get('mode')||'viewer',session=params.get('session')||''
  const print=mode==='print',audience=mode==='audience',count=diagramSteps(visual)
  const channelKey=`lecture-diagram-focus:${location.pathname}:${session}:${slideId||visual.caption}`
  const channel=useRef<BroadcastChannel|null>(null)
  useEffect(()=>{
    if(!session||!['presenter','audience'].includes(mode)||mode==='presenter'&&!interactive)return
    const restore=()=>{try{const saved=JSON.parse(localStorage.getItem(channelKey)||'null');if(saved&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<=count){setStep(saved.step);sequence.current=saved.sequence||0}}catch{/* A new diagram starts with its overview. */}}
    if(audience)restore()
    const receive=(event:MessageEvent)=>{
      const value=event.data
      if(value?.hello&&!audience){channel.current?.postMessage({step:stepRef.current,sequence:sequence.current});return}
      if(audience&&value&&Number.isInteger(value.step)&&value.step>=0&&value.step<=count&&value.sequence>=sequence.current){sequence.current=value.sequence;setStep(value.step)}
    }
    channel.current=new BroadcastChannel(channelKey);channel.current.onmessage=receive;channel.current.postMessage({hello:true})
    const storage=(event:StorageEvent)=>{if(event.key===channelKey&&audience)restore()}
    window.addEventListener('storage',storage)
    return()=>{channel.current?.close();channel.current=null;window.removeEventListener('storage',storage)}
  },[session,mode,channelKey,count,audience,interactive])
  const choose=(value:number)=>{
    setStep(value)
    if(mode==='presenter'&&session){const message={step:value,sequence:++sequence.current};channel.current?.postMessage(message);try{localStorage.setItem(channelKey,JSON.stringify(message))}catch{/* Live synchronization remains available. */}}
  }
  const navigation=interactive&&!print&&!audience&&count>1?<nav className="rd-controls" aria-label="Шаги схемы" onKeyDown={event=>event.stopPropagation()}>
    <button type="button" className={step===0?'active':''} onClick={()=>choose(0)} aria-pressed={step===0}>Обзор</button>
    <button type="button" onClick={()=>choose(Math.max(0,step-1))} disabled={step===0}>Назад</button>
    <span role="status">{step===0?'Вся схема':`Шаг ${step} из ${count}`}</span>
    <button type="button" onClick={()=>choose(Math.min(count,step+1))} disabled={step===count}>Далее</button>
  </nav>:null
  return <figure className={`infographic infographic-${visual.type} readable-diagram`} aria-describedby={id}>
    <div className="rd-body"><ReadableDiagram visual={visual} base={base} step={print?0:step}/></div>
    <figcaption id={id}>{visual.caption}</figcaption>{navigation}
    {!control&&!print&&!audience&&<button className="diagram-open-button" onClick={()=>setView('diagram')}>Развернуть схему</button>}
    {view&&createPortal(<Modal title={view==='text'?'Текст схемы':'Разбор схемы'} wide closable={!audience} onClose={()=>{if(!audience)setView(null)}}>
      <div className="rd-expanded" tabIndex={0} role="region" aria-label="Схема с пояснениями">
        {view==='text'?<InfographicMobile visual={visual} base={base}/>:<ReadableDiagram visual={visual} base={base} step={step}/>}
        <p className="rd-expanded-caption">{visual.caption}</p>
      </div>{navigation}<div className="diagram-dialog-actions">
        {!audience&&<button className="button ghost" onClick={()=>setView(view==='text'?'diagram':'text')}>{view==='text'?'Показать схему':'Текст схемы'}</button>}
        {!audience&&<button className="button primary" onClick={()=>setView(null)}>Закрыть</button>}
      </div>
    </Modal>,document.body)}
  </figure>
}
