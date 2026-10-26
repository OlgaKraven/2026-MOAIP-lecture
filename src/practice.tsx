import {useEffect,useRef,useState} from 'react';

let explanations:Promise<Record<string,string>>|undefined;
export function Practice({id,interactive}:{id:string;interactive:boolean}){
  const [answer,setAnswer]=useState('');
  const [shown,setShown]=useState(false);
  const [response,setResponse]=useState('');
  const query=new URLSearchParams(location.search);
  const mode=query.get('mode')||'viewer',session=query.get('session')||'';
  const audience=mode==='audience',print=mode==='print';
  const key=`moaip-practice:${location.pathname}:${session}:${id}`;
  const channel=useRef<BroadcastChannel|null>(null);
  useEffect(()=>{
    if(!shown||print)return;
    let active=true;
    explanations??=fetch(import.meta.env.BASE_URL+'explanations.json').then(r=>{if(!r.ok)throw Error('Разбор недоступен');return r.json()}).catch(e=>{explanations=undefined;throw e});
    explanations.then(data=>{if(active)setAnswer(data[id]||'Разбор не найден')}).catch(()=>{if(active)setAnswer('Не удалось получить разбор. Вернитесь к условию и повторите.');});
    return()=>{active=false};
  },[shown,id,print]);
  useEffect(()=>{
    setShown(false);setResponse('');
    if(!session||!['presenter','audience'].includes(mode))return;
    const restore=()=>{if(audience)try{setShown(JSON.parse(localStorage.getItem(key)||'false')===true)}catch{/* Start with the task. */}};
    restore();
    const bus=new BroadcastChannel(key);channel.current=bus;
    bus.onmessage=e=>{if(audience&&typeof e.data?.shown==='boolean')setShown(e.data.shown)};
    const listener=(e:StorageEvent)=>{if(e.key===key)restore()};
    window.addEventListener('storage',listener);
    return()=>{bus.close();channel.current=null;window.removeEventListener('storage',listener)};
  },[id,key,mode,session,audience]);
  const reveal=()=>{
    const value=!shown;setShown(value);
    if(mode==='presenter'){
      channel.current?.postMessage({shown:value});
      try{localStorage.setItem(key,JSON.stringify(value))}catch{/* Broadcast remains usable. */}
    }
  };
  return <div className="moaip-practice">
    {interactive&&!audience&&!print&&<>
      {mode!=='presenter'&&<label>Ваше рассуждение<textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Укажите исходные данные, действие и ожидаемый результат"/></label>}
      <button className="button primary" aria-expanded={shown} onClick={reveal}>{shown?'Вернуться к условию':'Показать разбор'}</button>
    </>}
    {shown&&!print&&<section className="moaip-solution" aria-label="Разбор"><h3>Разбор</h3><p>{answer}</p></section>}
  </div>;
}
