/* Simulation DOM minimale pour la logique des événements, pas un test navigateur. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const folder=path.resolve(process.argv[2]||__dirname);
let document;
const decode=s=>s.replaceAll('&nbsp;','\u00a0').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>');
class Element {
  constructor(tag,attrs={}){this.tagName=tag;this.attrs=attrs;this.children=[];this.listeners={};this.style={};this._text='';this.hidden='hidden' in attrs;this.disabled='disabled' in attrs;this.checked=false;this.value=attrs.value||'';this.name=attrs.name||'';this.type=attrs.type||'';this.parent=null;}
  get dataset(){return Object.fromEntries(Object.entries(this.attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]));}
  get className(){return this.attrs.class||'';} set className(v){this.attrs.class=v;}
  get classList(){const self=this;return {contains:v=>self.className.split(/\s+/).includes(v),add(...values){self.className=[...new Set([...self.className.split(/\s+/),...values])].filter(Boolean).join(' ');},remove(...values){self.className=self.className.split(/\s+/).filter(v=>!values.includes(v)).join(' ');}};}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(v){this._text=String(v);this.children=[];}
  setAttribute(k,v){this.attrs[k]=String(v);}removeAttribute(k){delete this.attrs[k];}
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
  addEventListener(type,callback){(this.listeners[type]??=[]).push(callback);}
  fire(type,extra={}){for(const fn of this.listeners[type]||[])fn({target:this,preventDefault(){},...extra});}
  focus(){document.activeElement=this;} scrollIntoView(){}
  reset(){for(const i of this.querySelectorAll('input')){if(i.type!=='radio')i.value='';i.checked=false;}}
  matches(simple){
    const attr=[...simple.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
    if(attr.some(m=>m[1]==='name'?this.name!==m[2]:!(m[1] in this.attrs)||(m[2]!==undefined&&this.attrs[m[1]]!==m[2])))return false;
    const bare=simple.replace(/\[[^\]]+\]/g,'');
    const tag=bare.match(/^[a-z][\w-]*/i);if(tag&&this.tagName!==tag[0])return false;
    const id=bare.match(/#([\w-]+)/);if(id&&this.attrs.id!==id[1])return false;
    return [...bare.matchAll(/\.([\w-]+)/g)].every(m=>this.classList.contains(m[1]));
  }
  querySelectorAll(selector){
    const patterns=selector.split(',').map(s=>s.trim().split(/\s+/));const result=[];
    const visit=node=>{for(const child of node.children){
      if(patterns.some(parts=>{if(!child.matches(parts.at(-1)))return false;let p=child.parent;for(let i=parts.length-2;i>=0;i--){while(p&&!p.matches(parts[i]))p=p.parent;if(!p)return false;p=p.parent;}return true;}))result.push(child);
      visit(child);
    }};visit(this);return result;
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function parse(html){
  const root=new Element('document'),stack=[root],voids=new Set(['meta','link','input','br','hr','path']);
  for(const match of html.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/[^>]+>|<[^>]+>|[^<]+/g)){
    const token=match[0];if(token.startsWith('<!'))continue;
    if(token.startsWith('</')){const tag=token.slice(2,-1).trim();while(stack.length>1){if(stack.pop().tagName===tag)break;}continue;}
    if(token.startsWith('<')){
      const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
      const attrs={};for(const a of token.slice(tag.length+1,-1).matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)')?/g))attrs[a[1]]=decode(a[2]??a[3]??'');
      const el=new Element(tag,attrs);stack.at(-1).append(el);if(!voids.has(tag)&&!token.endsWith('/>'))stack.push(el);
    }else stack.at(-1)._text+=decode(token);
  }
  root.documentElement=root.querySelector('html');return root;
}
document=parse(fs.readFileSync(path.join(folder,'index.html'),'utf8'));
document.createElement=tag=>new Element(tag);
const NativeDate=Date;
class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-03T08:00:00Z']));}static now(){return new NativeDate('2026-11-03T08:00:00Z').getTime();}}
const context={document,window:{matchMedia:()=>({matches:true})},Date:FixedDate,Intl,console,module:{exports:{}},requestAnimationFrame:fn=>fn(),fetch:()=>{throw Error('Unexpected network');}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(folder,'script.js'),'utf8'),context);
const $=s=>document.querySelector(s),form=$('#booking-form');
function choose(name,predicate){const list=document.querySelectorAll(`input[name="${name}"]`);const input=list.find(i=>!i.disabled&&predicate(i));assert.ok(input,`Choice ${name} exists`);for(const i of list)i.checked=i===input;form.fire('change',{target:input});return input;}
const submit=()=>form.fire('submit');
assert.equal($('#booking-app').hidden,false);
assert.equal($('.booking-fallback').hidden,true);
assert.equal(document.querySelectorAll('input[name="service"]').length,8);
submit();assert.ok($('#flow-error').textContent.length);
$('[data-preset="consultation"]').fire('click');
assert.equal($('[data-panel="1"]').hidden,false);
assert.equal(document.querySelectorAll('input[name="day"]').length,14);
choose('day',i=>i.value==='2026-11-04');submit();
assert.equal($('[data-panel="2"]').hidden,false);
choose('time',()=>true);submit();assert.equal($('[data-panel="3"]').hidden,false);
$('#first-name').value='A';$('#phone').value='123';submit();
assert.equal($('#first-name').attrs['aria-invalid'],'true');
assert.equal($('#phone').attrs['aria-invalid'],'true');
assert.equal(document.activeElement,$('#first-name'));
// A completed step becomes unavailable as soon as its selected time is invalidated.
$('[data-step="1"]').fire('click');choose('day',i=>i.value==='2026-11-05');
assert.equal($('[data-step="3"]').disabled,true);
assert.equal($('#summary-time').textContent,'À choisir');submit();
choose('time',()=>true);submit();
$('#first-name').value='Camille';$('#phone').value='06 00 00 00 00';submit();
assert.equal($('#booking-success').hidden,false);assert.equal(form.hidden,true);
assert.ok($('#success-recap').textContent.includes('Camille'));
assert.ok($('#success-recap').textContent.includes('Consultation'));
assert.equal(document.activeElement,$('#success-title'));
assert.equal($('#phone').value,'');assert.equal($('#first-name').value,'');
$('#restart').fire('click');assert.equal(form.hidden,false);assert.equal($('#booking-success').hidden,true);
assert.equal($('#summary-service').textContent,'À choisir');assert.equal($('#success-recap').textContent,'');
choose('service',i=>i.value==='couleur');submit();choose('day',i=>i.value==='2026-11-06');submit();
const available=document.querySelectorAll('input[name="time"]').filter(i=>!i.disabled);
assert.ok(available.every(i=>Number(i.value)+90<=1140));
$('[data-step="0"]').fire('click');choose('service',i=>i.value==='homme');
assert.equal($('#summary-day').textContent,'À choisir');assert.equal($('[data-step="2"]').disabled,true);
assert.equal($('[data-step="3"]').disabled,true);
console.log(`PASS DOM simulé : ${path.basename(folder)} — présélection, 4 étapes, erreurs, focus, changement de jour/service, récapitulatif, succès honnête, effacement, redémarrage.`);
