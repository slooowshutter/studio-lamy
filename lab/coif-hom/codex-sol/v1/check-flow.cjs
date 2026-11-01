/* Harnais DOM minimal : tests du parcours réel, sans dépendance ni navigateur. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const base=process.argv[2]||__dirname;
class Element {
  constructor(tag='div',attrs={}) {this.tag=tag;this.attrs=attrs;this.children=[];this.events={};this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.textContent='';this.style={};this.classes=new Set();this.dataset={};for(const [k,v] of Object.entries(attrs)){if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;else this[k]=v;}this.classList={add:(...c)=>c.forEach(x=>this.classes.add(x)),remove:(...c)=>c.forEach(x=>this.classes.delete(x)),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  set className(v){this.classes=new Set(v.split(' '));} get className(){return [...this.classes].join(' ');}
  append(...els){for(const el of els){if(el.tag==='fragment')this.append(...el.children);else {this.children.push(el);el.parent=this;}}}
  replaceChildren(...els){this.children=[];this.append(...els);}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  focus(){document.activeElement=this;}
  addEventListener(type,fn){(this.events[type]||=[]).push(fn);}
  fire(type,target=this){for(const fn of this.events[type]||[])fn({target,preventDefault(){}});}
  getBoundingClientRect(){return {top:0};}
  reset(){for(const el of this.querySelectorAll('input')){el.checked=false;el.value=el.attrs.value||'';}}
  querySelectorAll(selector){const results=[];const matches=el=>{if(selector.startsWith('#'))return el.id===selector.slice(1);if(selector.startsWith('.'))return el.classes.has(selector.slice(1));const tag=selector.match(/^[a-z]+/);if(tag&&el.tag!==tag[0])return false;if(selector.includes(':not(:disabled)')&&el.disabled)return false;const attrs=[...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];for(const [,key,value]of attrs){let val=key.startsWith('data-')?el.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:el[key]??el.attrs[key];if(value===undefined?val===undefined:String(val)!==value)return false;}return true;};const walk=el=>{for(const child of el.children){if(matches(child))results.push(child);walk(child);}};walk(this);return results;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
// Lire les balises et attributs de la page, plutôt que reproduire le formulaire.
const document=new Element('document');let stack=[document];
const voidTags=new Set(['meta','link','input','br','hr','wbr']);
const html=fs.readFileSync(base+'/index.html','utf8');
for(const token of html.matchAll(/<\/?[a-zA-Z][^>]*>/g)) {
  const raw=token[0],closing=raw.startsWith('</'),tag=raw.match(/^<\/?([a-zA-Z]+)/)[1].toLowerCase();
  if(closing){const index=stack.map(e=>e.tag).lastIndexOf(tag);if(index>0)stack.length=index;continue;}
  const attrs={};for(const [,key,quote,value] of raw.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g))attrs[key]=value;
  for(const [,key] of raw.matchAll(/\s(data-[\w-]+)(?=\s|>)/g))attrs[key]='';
  const el=new Element(tag,attrs);if(/\sdisabled(?:\s|>)/.test(raw))el.disabled=true;if(/\shidden(?:\s|>)/.test(raw))el.hidden=true;
  stack.at(-1).append(el);if(!voidTags.has(tag))stack.push(el);
}
document.documentElement=document.querySelector('html');document.createElement=t=>new Element(t);document.createDocumentFragment=()=>new Element('fragment');
const fixed='2026-11-03T08:10:00Z';let current=fixed;
class FakeDate extends Date{constructor(...args){super(...(args.length?args:[current]));}static now(){return +new Date(current);}}
const context={document,window:{},matchMedia:()=>({matches:true,addEventListener(){}}),Date:FakeDate,Intl,console,setInterval(){},setTimeout:fn=>fn(),requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},navigator:{clipboard:{writeText:async()=>{}}},innerHeight:900};
vm.createContext(context);vm.runInContext(fs.readFileSync(base+'/script.js','utf8'),context);
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),form=$('#booking-form');
const submit=()=>form.fire('submit');
const change=(input)=>{input.checked=true;form.fire('change',input);};
const selectService=id=>change($(`input[name="service"][value="${id}"]`));
const selectDay=key=>change($(`input[name="day"][value="${key}"]`));
const selectTime=()=>{const input=$$('input[name="time"]').find(x=>!x.disabled);assert(input,'Une heure disponible existe');change(input);return +input.value;};
submit();assert($('#choice-error').textContent.includes('prestation'),'Validation du choix initial');
selectService('duo');submit();
assert.equal($$('input[name="day"]').length,14,'14 jours');
assert($('input[name="day"][value="2026-11-08"]').disabled,'Dimanche fermé');assert($('input[name="day"][value="2026-11-09"]').disabled,'Lundi fermé');
selectDay('2026-11-07');submit();
const saturday=$$('input[name="time"]');assert(saturday.every(x=>+x.value+45<=1020),'Fin de prestation avant 17 h samedi');assert(saturday.some(x=>x.disabled),'Créneaux occupés simulés');
selectTime();submit();submit();assert.equal($('#first-name').attrs['aria-invalid'],'true','Prénom requis');
$('#first-name').value='Émile';$('#phone').value='0144444444';submit();assert.equal($('#phone').attrs['aria-invalid'],'true','Un mobile requis');
$('#phone').value='+33 6 12 34 56 78';submit();assert.equal($('#success').hidden,false,'Succès inline');assert($('#success-recap').textContent.includes('38'),'Prix du duo');assert.equal($('#booking-form').hidden,true,'Formulaire masqué après succès');
$('#restart').fire('click');assert.equal($('#first-name').value,'','Effacement prénom');assert.equal($('#phone').value,'','Effacement téléphone');assert.equal($('#success').hidden,true,'Réinitialisation succès');
// Revenir au menu et changer la prestation invalide jour et heure.
selectService('coupe');submit();selectDay('2026-11-03');submit();
assert($$('input[name="time"]').find(x=>+x.value===540).disabled,'Créneaux passés aujourd’hui');
selectTime();submit();$('[data-step="0"]').fire('click');selectService('barbe');assert.equal($('[data-summary="date"]').textContent,'À choisir','Jour invalidé');assert.equal($('[data-summary="time"]').textContent,'À choisir','Heure invalidée');
// Laisser la page ouverte : nouvelle date au moment de terminer.
submit();selectDay('2026-11-03');submit();selectTime();submit();$('#first-name').value='Marc';$('#phone').value='0612345678';current='2026-11-04T08:00:00Z';submit();assert($('#choice-error').textContent.includes('nouveau jour'),'Récupération journée expirée');assert.equal($('[data-panel="1"]').hidden,false,'Retour au jour');
// Préselection par la carte après remise à zéro.
$('#restart').fire('click');$('[data-book="duo"]').fire('click');assert.equal($('[data-summary="service"]').textContent,'Coupe + barbe','Carte préselectionne');assert.equal($('[data-panel="1"]').hidden,false,'Carte ouvre le choix du jour');
console.log('OK : parcours complet, 14 jours, fermetures, limites samedi, passé, validation, retours, reset, expiration et présélection. Harnais DOM, pas de rendu navigateur.');
