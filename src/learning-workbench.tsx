import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './learning-workbench.css';

export type Frame={label:string;line?:number;variables:Record<string,string>;console?:string[];condition?:string;branch?:'yes'|'no';objects?:{id:string;fields:Record<string,string>}[];links?:{name:string;target:string}[];tiles?:number[]};
export type Scenario={id:string;title:string;given:string;frames:Frame[];review:string;accepted:string[];hint:string;code?:string};
export type LearningModel={id:string;title:string;lectureId?:string;slideId?:string;revision?:string;demonstration?:boolean;mode:'flow'|'code'|'objects'|'table'|'tiles';code?:string;condition?:string;yes?:string;no?:string;task:string;output:string;scenarios:Scenario[]};
type Snapshot={scenario:string;step:number;playing:boolean;expanded:boolean;input:string;reasoning?:string;checked:boolean;reveal:boolean;menu:boolean;comparisons:{title:string;result:string}[];drafts?:Record<string,{input:string;reasoning?:string;checked:boolean;reveal:boolean}>;sequence:number};
let models:Record<string,LearningModel>={};
export function setLearningModels(value:Record<string,LearningModel>){models=value}
const initial=(model:LearningModel):Snapshot=>({scenario:model.scenarios[0].id,step:0,playing:false,expanded:false,input:'',checked:false,reveal:false,menu:false,comparisons:[],sequence:0});
const normalize=(value:string)=>value.trim().toLocaleLowerCase('ru').replace(/\s+/g,' ').replace(',','.');
const matches=(answer:string,expected:string)=>{
 const a=normalize(answer),e=normalize(expected);
 return a===e||(a!==''&&e!==''&&Number.isFinite(Number(a))&&Number.isFinite(Number(e))&&Number(a)===Number(e));
};

function Flow({model,frame}:{model:LearningModel;frame:Frame}){
 const marker='arrow-'+model.id.replace(/[^a-zA-Z0-9]/g,'');
 return <svg className="lw-flow" viewBox="0 0 760 490" role="img" aria-label={model.title}>
  <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
  <g className="lw-arrows" fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd={`url(#${marker})`}><path d="M380 58V95"/><path d="M380 155V180"/><path d="M250 230H195V330"/><path d="M510 230H565V330"/><path d="M195 406V440H302"/><path d="M565 406V440H458"/></g>
  <g className="lw-node"><rect x="300" y="10" width="160" height="48" rx="24"/><text x="380" y="40">Начало</text></g>
  <g className="lw-node"><rect x="255" y="95" width="250" height="60"/><text x="380" y="120">Получить исходные</text><text x="380" y="144">значения</text></g>
  <g className="lw-node lw-decision"><path d="M380 180L510 230L380 280L250 230Z"/><foreignObject x="292" y="198" width="176" height="65"><div className="lw-svg-label lw-condition">{model.condition||frame.condition||'Условие выполнено?'}</div></foreignObject></g>
  <text className="lw-edge-label" x="207" y="215">Да</text><text className="lw-edge-label" x="540" y="215">Нет</text>
  <g className={`lw-node ${frame.branch==='yes'?'lw-current':''}`}><rect x="75" y="330" width="240" height="76"/><foreignObject x="85" y="337" width="220" height="64"><div className="lw-svg-label lw-action">{model.yes||'Выполнить операцию'}</div></foreignObject></g>
  <g className={`lw-node ${frame.branch==='no'?'lw-current':''}`}><rect x="445" y="330" width="240" height="76"/><foreignObject x="455" y="337" width="220" height="64"><div className="lw-svg-label lw-action">{model.no||'Отклонить операцию'}</div></foreignObject></g>
  <g className="lw-node"><rect x="302" y="416" width="156" height="48" rx="24"/><text x="380" y="447">Завершение</text></g>
 </svg>;
}

function Objects({frame}:{frame:Frame}){
 return <div className="lw-objects"><div className="lw-roots">{(frame.links||[]).map(link=><div key={link.name}><code>{link.name}</code><span aria-label="ссылается на">→</span><strong>{link.target}</strong></div>)}</div><div className="lw-heap">{(frame.objects||[]).map(object=><section key={object.id}><h4>{object.id}</h4><dl>{Object.entries(object.fields).map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></section>)}</div></div>;
}

function Scene({model,scenario,step,print=false}:{model:LearningModel;scenario:Scenario;step:number;print?:boolean}){
 const frame=scenario.frames[Math.min(step,scenario.frames.length-1)],previous=scenario.frames[Math.max(0,step-1)];
 const code=scenario.code||model.code;
 return <div className={`lw-scene lw-mode-${model.mode}`}>
  {model.mode==='flow'&&<Flow model={model} frame={frame}/>}
  {model.mode==='objects'&&frame.objects&&<Objects frame={frame}/>}
  {model.mode==='tiles'&&<div className="lw-tiles" aria-label="Поле фрагментов 2 на 2">{frame.tiles?.length?frame.tiles.map((id,index)=><div key={index} className={id===index?'lw-tile-correct':'lw-tile-moved'}><small>Позиция {index}</small><strong>Id {id}</strong></div>):<p>Пустой набор: поле не собрано</p>}</div>}
  {code&&model.mode!=='flow'&&<pre className="lw-code" aria-label="Исследуемый код"><code>{code.split('\n').map((line,i)=><span key={i} className={!print&&frame.line===i+1?'lw-current-line':''}><b>{i+1}</b>{line||' '}</span>)}</code></pre>}
  <div className="lw-snapshot"><table><caption>Состояние после шага</caption><thead><tr><th>Величина</th><th>Значение</th></tr></thead><tbody>{Object.entries(frame.variables).map(([name,value])=><tr key={name} className={!print&&previous.variables[name]!==value?'lw-value-changed':''}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody></table>
   {frame.console&&<div className="lw-console"><strong>Консоль</strong><pre>{frame.console.length?frame.console.join('\n'):'Вывод пока отсутствует'}</pre></div>}
  </div>
 </div>;
}

function WorkbenchDialog({title,children,readonly,review,onClose}:{title:string;children:React.ReactNode;readonly:boolean;review:boolean;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const focus=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>{ref.current?.close();focus?.focus()}},[]);
 useEffect(()=>{if(review)ref.current?.querySelector('.lw-review')?.scrollIntoView({block:'nearest'});else if(ref.current)ref.current.scrollTop=0},[review]);
 return createPortal(<dialog className="lw-dialog" ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();if(!readonly)onClose()}}><header><h2>{title}</h2>{!readonly&&<button type="button" onClick={onClose}>Закрыть</button>}</header>{children}</dialog>,document.body);
}

export function LearningWorkbench({id,passport=false,interactive=true}:{id:string;passport?:boolean;interactive?:boolean}){
 const model=models[id];if(!model)return <p role="alert">Не удалось открыть разбор.</p>;
 return <LearningWorkbenchContent key={id} model={model} passport={passport} interactive={interactive}/>;
}
function LearningWorkbenchContent({model,passport,interactive}:{model:LearningModel;passport:boolean;interactive:boolean}){
 const query=new URLSearchParams(location.search),mode=query.get('mode')||'viewer',session=query.get('session')||'';
 const audience=mode==='audience',print=mode==='print',readonly=audience||print||!interactive;
 const key=`moaip-learning:${location.pathname}:${model.revision||'1'}:${session}:${model.id}`;
 const [state,setState]=useState<Snapshot>(()=>{const fresh=initial(model);if(audience)return fresh;try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&model.scenarios.some(s=>s.id===saved.scenario&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<s.frames.length))return {...fresh,...saved,playing:false,expanded:false,menu:false}}catch{/* Keep the initial state when storage is unavailable. */}return fresh});const current=useRef(state);current.current=state;
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const root=useRef<HTMLDivElement>(null),channel=useRef<BroadcastChannel|null>(null);
 const [headerHost,setHeaderHost]=useState<Element|null>(null);
 const scenario=model.scenarios.find(s=>s.id===state.scenario)||model.scenarios[0];
 const max=scenario.frames.length-1,frame=scenario.frames[state.step]||scenario.frames[0];
 const update=(patch:Partial<Snapshot>)=>{if(!readonly)setState(s=>({...s,...patch,sequence:s.sequence+1}))};
 useEffect(()=>{
  if(!passport&&!readonly)setHeaderHost(root.current?.closest('.slide-frame')?.querySelector('.slide-header-actions')||null);
 },[passport,readonly]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');const listener=()=>{setReduced(media.matches);if(media.matches)setState(s=>({...s,playing:false}))};
  media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener);
 },[]);
 useEffect(()=>{
  if(!session||!['audience','presenter'].includes(mode)||(!audience&&!interactive))return;
  const valid=(value:Snapshot)=>value&&model.scenarios.some(s=>s.id===value.scenario&&Number.isInteger(value.step)&&value.step>=0&&value.step<s.frames.length)&&Number.isSafeInteger(value.sequence);
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(valid(saved))setState(audience?saved:{...saved,playing:false})}catch{/* A fresh session starts at the overview. */}
  const bus=new BroadcastChannel(key);channel.current=bus;
  bus.onmessage=event=>{if(event.data?.hello&&!audience)bus.postMessage(current.current);else if(audience&&valid(event.data)&&event.data.sequence>=current.current.sequence)setState(event.data)};
  const restore=(event:StorageEvent)=>{if(audience&&event.key===key)try{const data=JSON.parse(event.newValue||'null');if(valid(data)&&data.sequence>=current.current.sequence)setState(data)}catch{/* Keep the last valid state. */}};
  window.addEventListener('storage',restore);if(audience)bus.postMessage({hello:true});
  return()=>{bus.close();channel.current=null;window.removeEventListener('storage',restore)};
 },[session,mode,key,model,audience,interactive]);
 useEffect(()=>{
  if(mode==='presenter'&&interactive){channel.current?.postMessage(state);try{localStorage.setItem(key,JSON.stringify(state))}catch{/* The live channel still works. */}}
 },[state,key,mode,interactive]);
 useEffect(()=>{if(!readonly&&mode!=='presenter')try{localStorage.setItem(key,JSON.stringify({...state,playing:false,expanded:false,menu:false}))}catch{/* State remains usable in memory. */}},[state,key,readonly,mode]);
 useEffect(()=>{const pause=()=>{if(document.hidden&&!readonly)setState(s=>({...s,playing:false}))};document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause)},[readonly]);
 useEffect(()=>{
  if(!state.playing||readonly||reduced)return;
  if(state.step>=max){setState(s=>({...s,playing:false,sequence:s.sequence+1}));return}
  const timer=setTimeout(()=>setState(s=>({...s,step:s.step+1,sequence:s.sequence+1})),900);return()=>clearTimeout(timer);
 },[state.playing,state.step,max,readonly,reduced]);
 const selectScenario=(id:string)=>{const drafts={...state.drafts,[state.scenario]:{input:state.input,reasoning:state.reasoning,checked:state.checked,reveal:state.reveal}};update({scenario:id,step:0,playing:false,...(drafts[id]||{input:'',reasoning:'',checked:false,reveal:false}),drafts,menu:false})};
 const controls=!readonly&&<div className="lw-controls" onKeyDown={e=>e.stopPropagation()}>
  <div className="lw-scenario"><button type="button" aria-expanded={state.menu} aria-haspopup="listbox" onClick={()=>update({menu:!state.menu,playing:false})}>Сценарий: {scenario.title}</button></div>
  <button type="button" onClick={()=>update({step:0,playing:false})}>Обзор</button><button type="button" disabled={state.step===0} onClick={()=>update({step:state.step-1,playing:false})}>Назад</button>
  <button type="button" disabled={reduced||state.step===max} onClick={()=>update({playing:!state.playing})}>{state.playing?'Пауза':'Запуск'}</button>
  <button type="button" disabled={state.step===max} onClick={()=>update({step:state.step+1,playing:false})}>Далее</button><button type="button" onClick={()=>update({step:0,playing:false,reveal:false,checked:false})}>Повтор</button>
 </div>;
 const menu=state.menu&&<ul className="lw-options" role="listbox" aria-label="Сценарии">{model.scenarios.map(s=><li key={s.id} role="option" aria-selected={s.id===scenario.id}><button type="button" disabled={readonly} onClick={()=>selectScenario(s.id)}>{s.title}</button></li>)}</ul>;
 const lesson=<div className="lw-work" onKeyDown={e=>e.stopPropagation()}>
  <p className="lw-given">{scenario.given}</p>{controls}{menu}<p className="lw-step" role="status">Шаг {state.step} из {max}. {frame.label}</p>
  <Scene model={model} scenario={scenario} step={state.step}/>
  <section className="lw-task"><h3>{model.demonstration?'Объяснение выбранного случая':'Самостоятельное решение'}</h3><p>{model.demonstration?'Проследите состояния выбранного случая и объясните, из какого действия получился результат.':model.task}</p><p>{model.output}</p>
   {!model.demonstration&&<>
   <label>Ваш результат<input value={state.input} readOnly={readonly} tabIndex={readonly?-1:undefined} onChange={e=>update({input:e.target.value,checked:false,reveal:false})}/></label>
   <label>Обоснование: входы, действия и граница вывода<textarea value={state.reasoning||''} readOnly={readonly} tabIndex={readonly?-1:undefined} onChange={e=>update({reasoning:e.target.value})}/></label><p>Кнопка проверяет краткий результат. Обоснование сопоставьте с полным разбором после своей попытки.</p>
   {!readonly&&<div className="lw-actions"><button type="button" onClick={()=>update({checked:true})}>Проверить</button></div>}
   {state.checked&&<p className="lw-feedback" role="status">{!state.input.trim()?'Сначала запишите результат.':scenario.accepted.some(value=>matches(state.input,value))?'Верно. Обоснуйте ответ наблюдаемым состоянием.':scenario.hint}</p>}
   </>}
   {!readonly&&<div className="lw-actions"><button type="button" onClick={()=>update({reveal:!state.reveal,playing:false})}>{state.reveal?'Скрыть разбор':'Показать разбор'}</button><button type="button" disabled={state.step!==max} onClick={()=>update({comparisons:[...state.comparisons.slice(-2),{title:scenario.title,result:Object.entries(frame.variables).map(([k,v])=>`${k}: ${v}`).join('; ')}]})}>Сохранить результат для сравнения</button></div>}
   {state.reveal&&<div className="lw-review"><h4>Разбор решения</h4><p>{scenario.review}</p></div>}
  </section>
  {!!state.comparisons.length&&<table className="lw-comparisons"><caption>Сравнение запусков</caption><thead><tr><th>Сценарий</th><th>Наблюдение</th></tr></thead><tbody>{state.comparisons.map((run,i)=><tr key={i}><th scope="row">{run.title}</th><td>{run.result}</td></tr>)}</tbody></table>}
 </div>;
 const passportContent=<><p><strong>Задача.</strong> {model.scenarios[0].given}</p><p><strong>Что проверить.</strong> Запишите прогноз, проследите переходы и обоснуйте итог по последнему состоянию. Сравните его с примером лекции.</p></>;
 if(print)return <div className="lw-print">{passport?<>{passportContent}<a href={`${location.origin}${import.meta.env.BASE_URL}?lecture=${model.lectureId}&slide=${model.slideId}`}>Открыть разбор задачи</a></>:<><Scene model={model} scenario={scenario} step={max} print/><p>{scenario.review}</p></>}</div>;
 return <div ref={root} className={`learning-workbench ${passport?'lw-passport':''}`}>
  {passport?<>{passportContent}{!readonly&&<button className="lw-open" type="button" onClick={()=>update({expanded:true,playing:false})}>Разбор задачи</button>}</>:<><Scene model={model} scenario={scenario} step={state.step}/><p className="lw-step">{frame.label}</p>{controls}{menu}</>}
  {headerHost&&createPortal(<button className="diagram-header-button" type="button" onClick={()=>update({expanded:true,playing:false})}>Развернуть схему</button>,headerHost)}
  {state.expanded&&<WorkbenchDialog title={model.title} readonly={readonly} review={state.reveal} onClose={()=>update({expanded:false,playing:false})}>{lesson}</WorkbenchDialog>}
 </div>;
}
