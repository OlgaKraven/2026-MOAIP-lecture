import type {Note} from './engine/model';
let authored:Record<string,Note>={};
export function setAuthorNotes(notes:Record<string,Note>){authored=notes}
export function mergeAuthorNotes(overrides:Record<string,Partial<Note>>):Record<string,Note>{
 return Object.fromEntries(Object.entries(authored).map(([id,note])=>[id,{...note,...overrides[id]}]));
}
export function noteOverrides(notes:Record<string,Note>){
 return Object.fromEntries(Object.entries(notes).flatMap(([id,note])=>{
  const changed=Object.fromEntries(Object.entries(note).filter(([field,value])=>JSON.stringify(value)!==JSON.stringify(authored[id]?.[field as keyof Note])));
  return Object.keys(changed).length?[[id,changed]]:[];
 }));
}
export function noteFingerprint(value:unknown){
 let hash=2166136261;for(const character of JSON.stringify(value)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619)}return 'hash:'+String(hash>>>0);
}
