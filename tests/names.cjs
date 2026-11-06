const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../mods') + '/';

let terminalData = [], data = [], tabs = [], sort = 'priority', width = 268, paneProps = {}, calls = [];
function el() {
  const obj = { kids: [], attrs: {} };
  const proxy = new Proxy(obj, { get(o,k) {
    if (k in o) return o[k];
    return (...args) => {
      if(k === 'child') o.kids.push(args[0]);
      else if(k === 'children') o.kids.push(...args[0]);
      else if(k === 'when' && args[0]) args[1](proxy);
      else o.attrs[k] = args[0];
      return proxy;
    };
  }});
  return proxy;
}
function load(mod) {
  const helper = mod.startsWith('session-') ? fs.readFileSync(root+mod+'/session-title.js','utf8').replace(/export /g,'') : '';
  const code = fs.readFileSync((mod === 'agents' ? path.join(__dirname, 'baseline/agents.js') : root+mod+'/main.js'),'utf8').replace(/^import .*;\n/gm,'').replace('export default class','globalThis.Mod = class');
  const ctx = { View: class {}, div:el, svg:el, image:el, v_flex:el, h_flex:el,
    agents:()=>data, terminals:()=>terminalData, panes:()=>data.map(a=>({...a,terminal:a.address})),
    spaces:()=>[{id:'s',name:'Base',tabs}], focused:()=>({}), props:()=>paneProps,
    theme:()=>({}), layout:()=>({id:'sidebar',size:{px:width}}), shared:()=>sort,
    setShared:()=>{}, setAgentOrder:()=>{}, run:(...a)=>calls.push(a),
    openOverlay:()=>{}, closeOverlay:()=>{}, window:()=>({platform:'macos'}), home:()=>'/tmp',
    localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}} };
  vm.createContext(ctx); vm.runInContext(helper+'\n'+code,ctx);
  const instance = new ctx.Mod(); instance.init({}, {timer:{every:()=>{}}}); return instance;
}
function nodes(n) { return typeof n==='object' && n ? [n,...n.kids.flatMap(nodes)] : []; }
function texts(n) { return typeof n==='string' ? [n] : n && typeof n==='object' ? n.kids.flatMap(texts) : []; }
function rows(mod) { return nodes(mod.render({})).filter(n=>/^ag-t/.test(n.attrs.id||'')); }
function agent(id,app,title,tab='a') {return {address:id,pane:'p'+id,app,title,tab,tab_name:tabs.find(t=>t.id===tab)?.name,space:'s',space_name:'Base',status:'idle',seq:1,program:{key:app,name:app,agent:true}};}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
tabs=[{id:'a',name:'QA',named:true},{id:'b',name:'Other',named:true}];
const fixed=load('session-labels-agents'), original=load('agents');
test('reproduce original identical labels with two distinct Codex sessions',()=>{
 data=[agent('t1','codex','Alpha | tmp'),agent('t2','codex','Beta | tmp')];
 assert.deepEqual(texts(rows(original)[0]),texts(rows(original)[1]));
 assert.match(texts(rows(fixed)[0]).join(' '),/QA · Alpha/);
 assert.match(texts(rows(fixed)[1]).join(' '),/QA · Beta/);
});
test('live session rename updates existing view',()=>{data[0].title='Μετονομασία 🤖 | tmp';assert.match(texts(rows(fixed)[0]).join(' '),/Μετονομασία 🤖/);});
test('live tab rename keeps the session',()=>{tabs[0].name='Renamed';data.forEach(a=>a.tab_name='Renamed');assert.match(texts(rows(fixed)[0]).join(' '),/Renamed · Μετονομασία/);});
test('identical session names in different tabs remain distinct',()=>{
 data=[agent('t1','claude-code','Same'),agent('t2','claude-code','Same','b')];
 assert.notEqual(rows(fixed)[0].attrs.tooltip,rows(fixed)[1].attrs.tooltip);
});
test('identical names in same tab get terminal IDs',()=>{
 data[1].tab='a';data[1].tab_name='Renamed';const r=rows(fixed);
 assert.match(r[0].attrs.tooltip,/Same · t1$/);assert.match(r[1].attrs.tooltip,/Same · t2$/);
});
test('unnamed Codex Claude and OpenClaw have unique fallback',()=>{
 data=['codex','claude-code','openclaw'].map((app,i)=>agent('t'+i,app,''));
 const r=rows(fixed);assert.equal(new Set(r.map(x=>x.attrs.tooltip)).size,3);
 for(let i=0;i<3;i++)assert.match(r[i].attrs.tooltip,new RegExp('t'+i+'$'));
});
test('status transitions preserve Codex name and section',()=>{
 for(const [status,prefix,section] of [['working','[ > ] Working | ','Working'],['blocked','[ ! ] Action Required | ','Needs you'],['done','[ ✓ ] Done | ','Done'],['idle','','Idle']]){
 data=[agent('t1','codex',prefix+'Alpha | tmp')];data[0].status=status;
 const tree=fixed.render({});assert.match(texts(tree).join(' '),new RegExp(section));assert.match(rows(fixed)[0].attrs.tooltip,/Alpha$/);
 }});
test('OpenClaw display name including separators',()=>{data=[agent('t1','openclaw','OpenClaw | Jarvis 🤖 | IT')];assert.match(rows(fixed)[0].attrs.tooltip,/Jarvis 🤖 \| IT$/);});
test('long names remain complete in tooltip',()=>{data=[agent('t1','claude-code','Long '.repeat(100))];assert.match(rows(fixed)[0].attrs.tooltip,/Long Long/);assert.ok(rows(fixed)[0].attrs.tooltip.length>500);});
test('grouped view and pinned rows keep identity',()=>{sort='grouped';data=[agent('t1','claude-code','Alpha')];assert.match(texts(rows(fixed)[0]).join(' '),/Renamed · Alpha/);data[0].pinned=true;assert.match(texts(rows(fixed)[0]).join(' '),/Base/);sort='priority';});
test('row click still targets correct pane',()=>{calls=[];rows(fixed)[0].attrs.on_click();assert.equal(calls[0][0],'pane.focus');assert.equal(calls[0][1].pane,'pt1');});
test('collapsed view renders and preserves focus action',()=>{width=76;calls=[];rows(fixed)[0].attrs.on_click();assert.equal(calls[0][1].pane,'pt1');width=268;});
test('non-target agent display is unchanged',()=>{data=[agent('t1','pi','Some title')];assert.deepEqual(texts(rows(fixed)[0]),texts(rows(original)[0]));});
test('empty list renders without errors',()=>{data=[];assert.equal(rows(fixed).length,0);});
test('pane headers follow all three agents live',()=>{
 const pane=load('session-labels-pane');paneProps={pane:'pt1'};
 for(const [app,title,expected] of [['codex','Alpha | tmp','Alpha'],['claude-code','Beta','Beta'],['openclaw','OpenClaw | Γάμμα 🤖','Γάμμα 🤖']]){
 data=[agent('t1',app,title)];assert.ok(texts(pane.render({})).includes(expected));
 }});
test('kept sub-agent appears once and pinned remains reachable',()=>{
 paneProps={};data=[agent('t1','claude-code','Parent'),agent('t2','claude-code','Child')];
 terminalData=data.map(a=>({...a,state:'live',parent:a.address==='t2'?'t1':null}));
 let tree=nodes(fixed.render({}));
 assert.equal(tree.filter(n=>n.attrs.id==='ag-t2').length,0);
 assert.equal(tree.filter(n=>n.attrs.id==='sub-t2').length,1);
 data[1].pinned=true;tree=nodes(fixed.render({}));
 assert.equal(tree.filter(n=>n.attrs.id==='ag-t2').length,1);
 terminalData=[];
});
test('real Codex braille title is stable across frames',()=>{
 for(const glyph of ['⠋','⠙','⠹']) {data=[agent('t1','codex',glyph+' name | folder')];assert.equal(rows(fixed)[0].attrs.tooltip,'Base · Renamed · name');}
});
test('observed Claude OSC status prefixes normalize and generic titles fall back',()=>{
 for(const title of ['✳ Labels QA','◐ Labels QA']) {data=[agent('t1','claude-code',title)];assert.equal(rows(fixed)[0].attrs.tooltip,'Base · Renamed · Labels QA');}
 data=[agent('t1','claude-code','✳ Claude Code')];assert.equal(rows(fixed)[0].attrs.tooltip,'Base · Renamed · Claude · t1');
});
test('Codex names resembling status prefixes are preserved',()=>{
 for(const name of ['[!] Fix login','[*] a | b','[-] todo','[ > ] Working']) {data=[agent('t1','codex',name+' | repo')];assert.equal(rows(fixed)[0].attrs.tooltip,'Base · Renamed · '+name);}
});
test('unrecognized Codex title uses explicit address fallback',()=>{
 data=[agent('t1','codex','Name without folder')];assert.equal(rows(fixed)[0].attrs.tooltip,'Base · Renamed · Codex · t1');
});
test('automatic tab numbers deliberately retain context',()=>{
 tabs=[{id:'a',name:'2',named:false}];data=[agent('t1','claude-code','Review')];assert.equal(rows(fixed)[0].attrs.tooltip,'Base · 2 · Review');
});
test('duplicate sidebar IDs are nonshrinking and pane headers distinguish sessions',()=>{
 tabs=[{id:'a',name:'QA',named:true}];data=[agent('t1','claude-code','Review'),agent('t2','claude-code','Review')];
 for(const row of rows(fixed))assert.ok(nodes(row).some(n=>n.kids.includes(row.attrs.id.slice(3)) && Object.hasOwn(n.attrs,'flex_none')));
 const pane=load('session-labels-pane');paneProps={pane:'pt1'};
 assert.ok(texts(pane.render({})).includes('Review · t1'));
 paneProps={pane:'pt2'};assert.ok(texts(pane.render({})).includes('Review · t2'));
});
test('helper copies stay identical',()=>assert.equal(fs.readFileSync(root+'session-labels-agents/session-title.js','utf8'),fs.readFileSync(root+'session-labels-pane/session-title.js','utf8')));
console.log(`${passed} regression tests passed (actual mod render with mocked GPUI builders; native layout tested separately).`);
