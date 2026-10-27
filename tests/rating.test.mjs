import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateBreakdown,BREAKDOWNS,compareSnapshots,filterRankings,aggregateRankings,validateCharacter,japanDate } from '../src/lib/rating.mjs';
import { toCSV,parseCSV,readImport,previewImport } from '../src/lib/csv.mjs';

const character=(overrides={})=>({character_id:1,character_name:'彩葉',title_name:'作品A',title_id:1,voice_actor_name:'声優A',registered_year:2026,score_looks:80,score_personality:70,score_voice:90,score_cuteness:75,score_other:65,total_score:380,current_rank:1,tier_name:'Tier 1',revision:2,...overrides});
test('opening any breakdown preserves all integer scores and respects subcategory maxima',()=>{
  for(const {fields} of Object.values(BREAKDOWNS))for(let score=0;score<=100;score++){
    const result=allocateBreakdown(score,fields);
    assert.equal(Object.values(result).reduce((a,b)=>a+b,0),score);
    for(const [key,,max] of fields)assert.ok(result[key]>=0&&result[key]<=max);
  }
});
test('score and rank movements are independent and identity uses IDs despite renamed characters',()=>{
  const old=[character({current_rank:3}),character({character_id:2,current_rank:1}),character({character_id:3,current_rank:2})];
  const now=[character({character_name:'名前変更',current_rank:2}),character({character_id:2,total_score:390,current_rank:1}),character({character_id:4,current_rank:3})];
  const result=compareSnapshots(now,old);
  assert.equal(result[0].score_delta,0);assert.equal(result[0].rank_delta,1);assert.equal(result[0].status,'matched');
  assert.equal(result.find(r=>r.character_id===3).status,'removed');assert.equal(result.find(r=>r.character_id===4).status,'new');
});
test('ambiguous historical IDs never produce fabricated deltas',()=>{
  const result=compareSnapshots([character()],[character(),character({total_score:100})]);
  assert.equal(result[0].status,'ambiguous');assert.equal(result[0].score_delta,null);assert.equal(result[0].rank_delta,null);
});
test('filtering keeps global ranks and sorting does not mutate source data',()=>{
  const rows=[character(),character({character_id:2,title_name:'作品B',score_voice:100,current_rank:2})];
  assert.equal(filterRankings(rows,{query:'作品Ｂ',tier:'Tier 1'})[0].current_rank,2);
  assert.deepEqual(filterRankings(rows,{sort:'score_voice:desc'}).map(r=>r.character_id),[2,1]);assert.equal(rows[0].character_id,1);
});
test('aggregates calculate member count, average and best character',()=>{
  const [group]=aggregateRankings([character(),character({character_id:2,total_score:400})],'title_name');
  assert.equal(group.count,2);assert.equal(group.average,390);assert.equal(group.best.character_id,2);
});
test('CSV roundtrips commas, quotes, newlines, Unicode and spreadsheet formulas',()=>{
  const source=character({character_name:'=彩葉,"A"\n次の行',voice_actor_name:'@声優',looks_breakdown:{face:40,hair:10,body:8,bust:14,expression:8}});
  const csv=toCSV([source]);const [restored]=readImport(csv,'ranking.csv');
  assert.equal(restored.character_name,source.character_name);assert.equal(restored.voice_actor_name,source.voice_actor_name);assert.deepEqual(restored.looks_breakdown,source.looks_breakdown);
  assert.ok(csv.includes('"\'=彩葉'));assert.equal(parseCSV('a,b\r\n"x,y","a""b"')[1][1],'a"b');
});
test('malformed CSV and missing score cells are rejected instead of silently importing zero',()=>{
  assert.throws(()=>parseCSV('a\n"not closed'),/閉じられて/);
  assert.throws(()=>readImport('名前,作品\nA,B','x.csv'),/必要な列/);
  assert.throws(()=>validateCharacter(character({score_looks:''})),/整数/);
  assert.throws(()=>validateCharacter(character({score_looks:100.5})),/整数/);
  assert.throws(()=>validateCharacter(character({registered_year:1800})),/登録年/);
  assert.throws(()=>validateCharacter(character({score_voice:'80'})),/整数/);
  assert.throws(()=>validateCharacter(character({looks_breakdown:{face:null,hair:15,body:10,bust:15,expression:10}})),/内訳/);
});
test('leading apostrophes remain lossless while escaping spreadsheet formulas',()=>{
  for(const name of ["'=元の名前","'通常の名前","''二重引用",'-キャラ','@character'])assert.equal(readImport(toCSV([character({character_name:name})]),'data.csv')[0].character_name,name);
});
test('import preview matches by ID, retains expected revision, checks duplicates and stale IDs',()=>{
  const existing=[character()];
  const [update]=previewImport([character({character_name:'改名'})],existing);
  assert.equal(update.action,'update');assert.equal(update.row.expected_revision,2);
  assert.equal(previewImport([character({character_id:99})],existing)[0].action,'error');
  assert.equal(previewImport([character(),character()],existing)[1].action,'error');
  assert.equal(previewImport([character()],existing.map(c=>({...c,deleted_at:'2026-10-27'})))[0].action,'error');
  assert.equal(previewImport([character({character_id:null,character_name:'新人'})],existing)[0].action,'create');
});
test('backup import excludes recycle bin entries and validates the format',()=>{
  const rows=readImport(JSON.stringify({format:'anime-rating-backup',version:1,characters:[character(),character({character_id:2,deleted_at:'2026-10-27'})]}),'backup.json');
  assert.equal(rows.length,1);assert.throws(()=>readImport('{}','backup.json'),/対応する/);
});
test('filenames use the Japan calendar date near UTC midnight',()=>{
  assert.equal(japanDate(new Date('2026-10-26T16:00:00Z')),'2026-10-27');
});

