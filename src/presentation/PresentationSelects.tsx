import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {presentationRole,usePresentationSync} from './usePresentationSync'
import './presentation-interactions.css'

type Menu={open:boolean;kind:'matching'|'diagram';id:string;index:number;highlight:number}
const closed:Menu={open:false,kind:'matching',id:'',index:0,highlight:0}
function validMenu(value:unknown):value is Menu{
 if(!value||typeof value!=='object')return false
 const menu=value as Menu
 return typeof menu.open==='boolean'&&['matching','diagram'].includes(menu.kind)&&typeof menu.id==='string'&&Number.isInteger(menu.index)&&menu.index>=0&&Number.isInteger(menu.highlight)&&menu.highlight>=0
}
function locate(menu:Menu,audience:boolean){
 const scope=audience?'.audience-slide':'.mini-stage',id=CSS.escape(menu.id)
 const root=menu.kind==='matching'?document.querySelector(`${scope} [data-slide-id="${id}"] .matching-fields`):
  document.querySelector(`.lv-dialog [data-learning-visual="${id}"]`)||document.querySelector(`${scope} [data-learning-visual="${id}"]`)
 return root?.querySelectorAll<HTMLSelectElement>(menu.kind==='matching'?'select':'.lv-choice select')[menu.index]||null
}

export function PresentationSelects({courseId}:{courseId:string}){
 const [scope,setScope]=useState('')
 useEffect(()=>{
  const update=()=>{const role=presentationRole();setScope(role.mode?`${role.mode}:${role.session}`:'')}
  const observer=new MutationObserver(update)
  observer.observe(document.getElementById('root')!,{subtree:true,childList:true})
  window.addEventListener('popstate',update);update()
  return()=>{observer.disconnect();window.removeEventListener('popstate',update)}
 },[])
 return scope?<SelectMenu key={scope} courseId={courseId}/>:null
}
function SelectMenu({courseId}:{courseId:string}){
 const [menu,setMenu,audience]=usePresentationSync(`${courseId}:select-menu`,()=>closed,validMenu)
 const current=useRef(menu);current.current=menu
 const popup=useRef<HTMLDivElement>(null)
 const [position,setPosition]=useState<{left:number;top:number;width:number;maxHeight:number;fontSize:number}|null>(null)
 const [options,setOptions]=useState<{value:string;label:string;disabled:boolean}[]>([])
 const select=menu.open?locate(menu,audience):null
 const close=()=>setMenu(state=>({...state,open:false}))
 function open(element:HTMLSelectElement){
  if(element.disabled)return
  const diagram=element.closest<HTMLElement>('[data-learning-visual]'),matching=element.closest('.matching-fields')
  const root=diagram||matching,id=diagram?.dataset.learningVisual||element.closest<HTMLElement>('[data-slide-id]')?.dataset.slideId
  if(!root||!id)return
  const index=Array.from(root.querySelectorAll('select')).indexOf(element)
  element.focus()
  setMenu({open:true,kind:diagram?'diagram':'matching',id,index,highlight:Math.max(0,element.selectedIndex)})
 }
 function commit(index:number){
  const element=locate(current.current,false),option=element?.options[index]
  if(!element||!option||option.disabled)return
  element.value=option.value
  element.dispatchEvent(new Event('change',{bubbles:true}))
  close();element.focus()
 }
 useEffect(()=>{
  if(audience)return
  const pointer=(event:PointerEvent)=>{
   const target=event.target instanceof Element?event.target:null
   if(target?.closest('.presentation-select-menu'))return
   const element=target?.closest<HTMLSelectElement>('.mini-stage .matching-fields select,.mini-stage .lv-choice select,.lv-dialog .lv-choice select')
   if(element&&!element.disabled){event.preventDefault();const previous=locate(current.current,false);if(current.current.open&&previous===element)close();else open(element)}
   else if(current.current.open)close()
  }
  const key=(event:KeyboardEvent)=>{
   const element=event.target instanceof HTMLSelectElement?event.target:null
   if(!element?.matches('.mini-stage .matching-fields select,.mini-stage .lv-choice select,.lv-dialog .lv-choice select'))return
   const state=current.current
   if(!state.open){if([' ','Enter','ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopPropagation();open(element)}return}
   if(event.key==='Tab'){close();return}
   if(!['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key))return
   event.preventDefault();event.stopPropagation()
   if(event.key==='Escape'){close();return}
   if(event.key==='Enter'||event.key===' '){commit(state.highlight);return}
   const available=Array.from(element.options).flatMap((option,index)=>option.disabled?[]:[index])
   const index=available.indexOf(state.highlight)
   const highlight=event.key==='Home'?available[0]:event.key==='End'?available.at(-1):available[Math.max(0,Math.min(available.length-1,index+(event.key==='ArrowDown'?1:-1)))]
   if(highlight!==undefined)setMenu({...state,highlight})
  }
  const blur=(event:FocusEvent)=>{if(current.current.open&&event.target===locate(current.current,false)&&!(event.relatedTarget instanceof Element&&event.relatedTarget.closest('.presentation-select-menu')))close()}
  document.addEventListener('pointerdown',pointer,true);document.addEventListener('keydown',key,true);document.addEventListener('focusout',blur,true)
  return()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('keydown',key,true);document.removeEventListener('focusout',blur,true)}
 })
 useLayoutEffect(()=>{
  if(!menu.open){setPosition(null);return}
  let frame=0
  const update=()=>{
   const element=locate(menu,audience)
   if(!element){setPosition(null);return}
   const rect=element.getBoundingClientRect(),fontSize=Math.max(14,parseFloat(getComputedStyle(element).fontSize)),rowHeight=fontSize*1.4+20
   const width=Math.min(innerWidth-24,Math.max(rect.width,audience?420:300)),below=innerHeight-rect.bottom-12,above=rect.top-12
   const showAbove=below<Math.min(240,rowHeight*element.options.length)&&above>below
   const maxHeight=Math.max(60,Math.min(innerHeight*.6,showAbove?above:below))
   const height=Math.min(maxHeight,rowHeight*element.options.length+8)
   const next={left:Math.max(12,Math.min(rect.left,innerWidth-width-12)),top:showAbove?rect.top-height-4:rect.bottom+4,width,maxHeight,fontSize}
   setPosition(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next)
   setOptions(previous=>{const nextOptions=Array.from(element.options).map(option=>({value:option.value,label:option.text,disabled:option.disabled}));return JSON.stringify(previous)===JSON.stringify(nextOptions)?previous:nextOptions})
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update)}
  const observer=new MutationObserver(schedule);observer.observe(document.getElementById('root')!,{subtree:true,childList:true})
  window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);update()
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true)}
 },[menu,audience])
 useEffect(()=>{popup.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'})},[menu.highlight,options])
 useEffect(()=>{
  if(!select||audience)return
  select.setAttribute('aria-expanded','true');select.setAttribute('aria-controls','presentation-options');select.setAttribute('aria-activedescendant',`presentation-option-${menu.highlight}`)
  return()=>{select.removeAttribute('aria-expanded');select.removeAttribute('aria-controls');select.removeAttribute('aria-activedescendant')}
 },[select,audience,menu.highlight])
 if(!menu.open||!position)return null
 const host=select?.closest('dialog')||document.body
 return createPortal(<div ref={popup} className="presentation-select-menu" id="presentation-options" role="listbox" aria-label={select?.getAttribute('aria-label')||'Варианты'} style={{...position,pointerEvents:audience?'none':undefined}}>
  {options.map((option,index)=><button type="button" role="option" id={`presentation-option-${index}`} aria-selected={index===menu.highlight} disabled={option.disabled} key={`${index}:${option.value}`} tabIndex={-1} onPointerDown={event=>event.preventDefault()} onPointerMove={()=>{if(!audience&&index!==menu.highlight)setMenu({...menu,highlight:index})}} onClick={()=>commit(index)}>{option.label}</button>)}
 </div>,host)
}
