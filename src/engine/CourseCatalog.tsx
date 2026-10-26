import {useEffect,useState} from 'react'
import type {ReactNode} from 'react'
import {Download,LayoutGrid,List,Search} from 'lucide-react'
import QRCode from 'qrcode'
import type {Course,Lecture,Profile} from './model'
import {assetUrl,safeUrl} from './model'
import {read,save} from './storage'
import {Modal} from './Modal'
export function CourseCatalog({course,base,profile,materials,themeButton,onOpen,onPrint,onSettings,invalidLecture}:{course:Course;base:string;profile:Profile;materials:string;themeButton:ReactNode;onOpen:(lecture:Lecture)=>void;onPrint:(scope:string)=>void;onSettings:()=>void;invalidLecture:boolean}){
 const prefix=`lecture:${base}:${course.id}`
 const [view,setView]=useState<'grid'|'list'>(()=>read(`${prefix}:catalog-view`,'grid'))
 const [search,setSearch]=useState(''),[semester,setSemester]=useState<number|'all'>('all')
 const [materialOpen,setMaterialOpen]=useState(false),[qr,setQr]=useState('')
 useEffect(()=>{save(`${prefix}:catalog-view`,view)},[prefix,view])
 useEffect(()=>{let current=true;setQr('');if(safeUrl(materials))QRCode.toDataURL(materials,{width:320,margin:4,color:{dark:'#171719',light:'#ffffff'}}).then(value=>{if(current)setQr(value)});return()=>{current=false}},[materials])
 const lectures=course.lectures.filter(l=>(semester==='all'||l.semester===semester)&&l.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
 return <main className="catalog approved-catalog">
  <header className="catalog-header"><a href={base} className="brand-lockup"><img src={assetUrl(course.mark||course.logo,base)} alt="Синергия"/><span><strong>{course.code}</strong><small>{course.discipline}</small></span></a>
   <nav><button className="catalog-nav-link" onClick={()=>setMaterialOpen(true)}>Материалы</button><button className="catalog-nav-link" onClick={onSettings}>Преподавателю</button>{themeButton}</nav>
  </header>
  {invalidLecture&&<p className="notice">Выберите лекцию в каталоге.</p>}
  <section className="catalog-hero"><div className="hero-copy"><p className="eyebrow">{course.code} · {course.semesters.join(', ')} семестры</p><h1>{course.discipline}</h1>{profile.fullName&&<p className="catalog-teacher">{profile.fullName}{profile.position&&<span>{profile.position}</span>}{profile.department&&<span>{profile.department}</span>}</p>}</div><img className="catalog-mascot" src={assetUrl(course.mascot,base)} alt={course.mascotAlt}/></section>
  <section className="catalog-tools" aria-label="Поиск и вид каталога">
   <label className="search-field"><Search size={19}/><input aria-label="Поиск по темам" placeholder="Найти лекцию" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <div className="catalog-view" role="group" aria-label="Вид каталога"><button className="icon-button" aria-label="Карточки" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><LayoutGrid size={19}/></button><button className="icon-button" aria-label="Список" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={19}/></button></div>
   <div className="semester-filter">{(['all',...course.semesters] as const).map(value=><button key={value} aria-pressed={semester===value} className={semester===value?'active':''} onClick={()=>setSemester(value)}>{value==='all'?'Все семестры':`${value} семестр`}</button>)}</div>
  </section>
  <section className={`topic-grid catalog-${view}`} aria-label="Лекции">{lectures.map(lecture=><article className={`topic-card period-${course.semesters.indexOf(lecture.semester)}`} key={lecture.id}>
   <div className="topic-card-top"><span className="topic-index">{String(course.lectures.indexOf(lecture)+1).padStart(2,'0')}</span><span className="semester-tag">{lecture.semester} семестр</span></div>
   <h2>{lecture.title}</h2><div className="topic-card-actions"><button className="button ghost" onClick={()=>onPrint(lecture.id)}><Download size={17}/>Скачать PDF</button><button className="button primary" onClick={()=>onOpen(lecture)}>Открыть лекцию</button></div>
  </article>)}</section>
  {!lectures.length&&<p className="empty-state">Лекции не найдены. Измените запрос или семестр.</p>}
  {materialOpen&&<Modal title="Материалы" onClose={()=>setMaterialOpen(false)}>{qr?<><img className="catalog-materials-qr" src={qr} alt="QR-код папки материалов"/><a className="button primary" href={safeUrl(materials)} target="_blank" rel="noopener noreferrer">Открыть материалы</a></>:<><p>Ссылка на материалы ещё не указана.</p><button className="button primary" onClick={()=>{setMaterialOpen(false);onSettings()}}>Указать ссылку</button></>}</Modal>}
 </main>
}
