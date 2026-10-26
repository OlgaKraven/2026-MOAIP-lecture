import {Fragment,useLayoutEffect,useRef} from 'react';

export function QuestionTitle({text}:{text:string}){
  const ref=useRef<HTMLHeadingElement>(null);
  useLayoutEffect(()=>{
    const heading=ref.current;if(!heading)return;
    const measure=()=>{
      const words=[...heading.querySelectorAll<HTMLElement>('span')];
      const lines=[...new Set(words.map(word=>Math.round(word.getBoundingClientRect().top)))];
      for(const word of words)word.style.color=lines.length===2&&Math.round(word.getBoundingClientRect().top)===lines[1]?'var(--red)':'';
    };
    const observer=new ResizeObserver(measure);observer.observe(heading);measure();
    document.fonts.ready.then(()=>{if(ref.current===heading)measure()});
    return()=>observer.disconnect();
  },[text]);
  return <h2 ref={ref}>{text.split(' ').map((word,i)=><Fragment key={i}>{i>0?' ':''}<span>{word}</span></Fragment>)}</h2>;
}
