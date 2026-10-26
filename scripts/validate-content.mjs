import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateStructure,validateBank,validateTeacherPack} from '../src/engine/validation.ts';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
export function verify(course,pack,bank,models){
 validateStructure(course);validateTeacherPack(pack,course);validateBank(bank,course);
 assert.equal(course.lectures.length,19);
 assert.deepEqual(course.lectures.map(l=>l.semester),[...Array(9).fill(5),...Array(10).fill(6)]);
 const ids=course.lectures.flatMap(l=>l.slides.map(s=>s.id));
 assert.deepEqual(Object.keys(pack.notes).sort(),ids.toSorted());
 for(const l of course.lectures){
  assert.deepEqual(l.slides.slice(0,5).map(s=>s.kind),['title','literature','literature','materials','agenda']);
  assert.equal(l.slides[1].readingGroup,'primary');assert(l.slides[1].references.length);
  assert.equal(l.slides[2].readingGroup,'additional');assert(l.slides[2].references.length);
  let question=0,passport=false,types=[],visuals=0;
  const complete=()=>{if(question){assert.deepEqual(types,['single','multiple','short','matching'],`Four tasks required: ${l.id} question ${question}`);assert(visuals>0,`Missing infographic: ${l.id} question ${question}`);assert(passport,`Missing independent case: ${l.id} question ${question}`)}};
  for(const s of l.slides){
   if(s.kind==='section'){complete();question++;passport=false;types=[];visuals=0}
   if(s.visual)visuals++;
   if(s.learning){
    const m=models[s.learning.id];assert(m,`Missing ${s.learning.id}`);
    assert(m.scenarios.length>0);
    for(const sc of m.scenarios){assert(sc.frames.length>=3);assert(sc.accepted.length);assert(sc.review.length>35)}
    if(s.learning.passport){assert(!passport);passport=true;assert.equal(m.scenarios.length,1)}
   }
   if(s.task){assert(passport,`Missing question passport ${s.id}`);types.push(s.task.type)}
   const n=pack.notes[s.id];assert(n.script.length>65,`Short script ${s.id}`);
   assert.equal(n.notebook,s.notebook||'');
   if(s.task)assert(n.answer.length>30,`Missing key discussion ${s.id}`);
  }
  complete();assert.equal(question,l.id==='s05-01-team-git'?3:2);
 }
 assert.equal(Object.keys(models).length,78);
}
const course=read('public/course.json'),pack=read('public/teacher-pack.json'),bank=read('public/assessment.json'),models=read('public/workbenches.json');
verify(course,pack,bank,models);
// Metadata-only literature must fail: the actual opening screens are required.
const broken=structuredClone(course);broken.lectures[0].slides.splice(1,2);
assert.throws(()=>verify(broken,pack,bank,models));
const misplaced=structuredClone(course);misplaced.lectures[0].slides.push(...misplaced.lectures[0].slides.splice(1,2));
assert.throws(()=>verify(misplaced,pack,bank,models));
for(const field of ['mascot','logo','mark','ornament','font','topicArrow'])assert(fs.existsSync(new URL('../public/'+course[field],import.meta.url)));
console.log(`Verified: ${course.lectures.length} lectures, ${Object.keys(pack.notes).length} slides, ${Object.keys(bank.keys).length} tasks, ${Object.keys(models).length} models; 2 negative literature cases rejected.`);
