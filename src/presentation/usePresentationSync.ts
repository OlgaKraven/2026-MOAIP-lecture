import {useEffect,useRef,useState} from 'react'
import type {SetStateAction} from 'react'

export function presentationRole(){
 const url=new URL(location.href),mode=url.searchParams.get('mode'),session=url.searchParams.get('session')||''
 return {mode:session&&(mode==='presenter'||mode==='audience')?mode:'',session}
}

// Only public classroom interactions belong on this channel.
export function usePresentationSync<T>(key:string,initial:()=>T,valid:(value:unknown)=>value is T,enabled=true){
 const role=presentationRole(),active=enabled&&Boolean(role.mode),readonly=active&&role.mode==='audience'
 const [value,setValue]=useState(initial),current=useRef(value),validate=useRef(valid),publish=useRef(()=>{})
 current.current=value;validate.current=valid
 useEffect(()=>{
  if(!active)return
  const name=`moaip-presentation:${location.pathname}:${role.session}:${key}`
  const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel(name)
  let sequence=0,received=-1
  try{const cached=JSON.parse(localStorage.getItem(name)||'null');if(Number.isSafeInteger(cached?.sequence))sequence=cached.sequence}catch{/* BroadcastChannel remains available. */}
  const send=()=>{
   const message={kind:'state',sequence:++sequence,value:current.current}
   channel?.postMessage(message)
   try{localStorage.setItem(name,JSON.stringify(message))}catch{/* Storage is an optional fallback. */}
  }
  const receive=(message:unknown)=>{
   if(!message||typeof message!=='object')return
   const data=message as {kind?:string;sequence?:number;value?:unknown}
   if(data.kind==='hello'&&!readonly){send();return}
   if(readonly&&data.kind==='state'&&Number.isSafeInteger(data.sequence)&&data.sequence! > received&&validate.current(data.value)){
    received=data.sequence!;setValue(data.value)
   }
  }
  if(channel)channel.onmessage=event=>receive(event.data)
  const storage=(event:StorageEvent)=>{if(event.key===name&&event.newValue){try{receive(JSON.parse(event.newValue))}catch{/* Ignore malformed public state. */}}}
  window.addEventListener('storage',storage)
  if(readonly){
   try{receive(JSON.parse(localStorage.getItem(name)||'null'))}catch{/* Wait for the presenter. */}
   channel?.postMessage({kind:'hello'})
  }else{publish.current=send;send()}
  return()=>{publish.current=()=>{};channel?.close();window.removeEventListener('storage',storage)}
 },[active,readonly,key,role.session])
 useEffect(()=>{if(active&&!readonly)publish.current()},[value,active,readonly])
 const change=(next:SetStateAction<T>)=>{if(!readonly)setValue(next)}
 return [value,change,readonly] as const
}
