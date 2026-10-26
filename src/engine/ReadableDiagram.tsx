import type {Visual} from './model'
import {InfographicMobile} from './InfographicMobile'
export function diagramSteps(v:Visual):number {
  if(v.type==='process'||v.type==='timeline'||v.type==='layers'||v.type==='cycle')return v.items.length
  if(v.type==='cause')return 3
  return 0
}
export function ReadableDiagram({visual:v,base,step=0}:{visual:Visual;base:string;step?:number}){
  const items=v.type==='cause'?[{title:'Причина',text:v.cause},{title:'Последствие',text:v.effect},{title:'Исправление',text:v.solution}]
    :v.type==='process'||v.type==='timeline'||v.type==='layers'||v.type==='cycle'?v.items:null
  if(items)return <ol className={`rd-flow rd-count-${items.length} rd-${v.type}`}>
    {items.map((item,index)=><li key={index} className={step===index+1?'is-current':''} aria-current={step===index+1?'step':undefined}>
      <div className="rd-node-heading"><span className="rd-number">{String(index+1).padStart(2,'0')}</span><strong>{item.title}</strong></div><p>{item.text}</p>
    </li>)}
  </ol>
  if(v.type==='matrix'||v.type==='comparison')return <div className="rd-table-wrap"><table className="rd-table">
    <thead><tr>{v.columns.map((column,i)=><th key={i} scope="col">{column}</th>)}</tr></thead>
    <tbody>{v.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row">{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody>
  </table></div>
  if(v.type==='codeParts')return <div className="rd-code-parts">{v.parts.map((part,i)=><section className="rd-code" key={i}>
    <strong className="rd-code-label">{part.label}</strong><pre><code>{part.code}</code></pre><p className="rd-code-explanation">{part.explanation}</p>
  </section>)}</div>
  if(v.type==='network'&&v.nodes.some(node=>node.id==='reservations'))return <div className="rd-network"><svg className="rd-er" viewBox="0 0 800 320" role="img" aria-label="ER-модель пользователей, заявок, помещений и отзывов">
    <title>Сущности, ключи и кратности связей</title><desc>{v.edges.map(edge=>`${edge.from}: ${edge.label}`).join(' ')}</desc>
    <g fill="none" stroke="var(--muted)" strokeWidth="1.5"><path d="M210 80 H305"/><path d="M495 80 H590"/><path d="M400 155 V222"/></g>
    <g fill="var(--text)" fontFamily="Raleway,Arial,sans-serif" fontSize="18"><text x="220" y="69">1</text><text x="280" y="69">N</text><text x="511" y="69">N</text><text x="567" y="69">1</text><text x="412" y="177">1</text><text x="412" y="211">0..1</text></g>
    {[{name:'users',x:20,y:42,w:190,h:78,fields:['PK id']},{name:'reservations',x:305,y:18,w:190,h:137,fields:['PK id','FK user_id','FK venue_id']},{name:'venues',x:590,y:42,w:190,h:78,fields:['PK id']},{name:'reviews',x:305,y:222,w:190,h:92,fields:['FK reservation_id','UNIQUE']}].map(node=><g key={node.name}>
      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="2" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5"/>
      <path d={`M${node.x} ${node.y+39} h${node.w}`} stroke="var(--border)" strokeWidth="1"/>
      <text x={node.x+14} y={node.y+26} fill="var(--text)" fontFamily="Consolas,Courier New,monospace" fontSize="20" fontWeight="600">{node.name}</text>
      {node.fields.map((field,i)=><text key={field} x={node.x+14} y={node.y+62+i*24} fill="var(--muted)" fontFamily="Consolas,Courier New,monospace" fontSize="16">{field}</text>)}
    </g>)}
  </svg></div>
  return <InfographicMobile visual={v} base={base}/>
}
