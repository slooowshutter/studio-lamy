/* Local smoke check of the actual HTML and event handlers. No browser, packages or network.
   It checks behavior and focus; it cannot check visual layout or native browser semantics. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const parsed = JSON.parse(fs.readFileSync(0, 'utf8'));

class Element {
  constructor(tag, attrs = {}) {
    this.tagName = tag; this.attrs = {...attrs}; this.children = []; this.events = {};
    this.style = {}; this.dataset = {};
    for (const [key,value] of Object.entries(attrs)) if(key.startsWith('data-')) this.dataset[key.slice(5)] = value;
    this.hidden = 'hidden' in attrs; this.disabled = 'disabled' in attrs;
    this.checked = 'checked' in attrs; this.value = attrs.value || '';
    this.classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    this.classList = {
      add: (...values)=>values.forEach(value=>this.classes.add(value)),
      remove: (...values)=>values.forEach(value=>this.classes.delete(value)),
      contains: value=>this.classes.has(value),
      toggle: (value,on)=>on ? this.classes.add(value) : this.classes.delete(value)
    };
  }
  set className(value) { this.classes = new Set(value.split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classes].join(' '); }
  set id(value) {this.attrs.id = value;}
  get id() {return this.attrs.id;}
  set name(value) {this.attrs.name = value;}
  get name() {return this.attrs.name;}
  set type(value) {this.attrs.type = value;}
  get type() {return this.attrs.type;}
  set textContent(value) {this.children = [String(value)];}
  get textContent() {return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
  append(...children) {this.children.push(...children);}
  replaceChildren(...children) {this.children = children;}
  setAttribute(key,value) {this.attrs[key] = String(value);}
  removeAttribute(key) {delete this.attrs[key];}
  getAttribute(key) {return this.attrs[key] ?? null;}
  addEventListener(type,handler) {(this.events[type] ||= []).push(handler);}
  fire(type) {for(const handler of this.events[type] || []) handler({preventDefault(){}});}
  focus() {this.ownerDocument.activeElement = this;}
  reset() {this.querySelectorAll('input').forEach(input=>{input.value=''; input.checked=false;});}
  matches(selector) {
    if(selector.startsWith('#')) return this.id === selector.slice(1);
    if(selector.startsWith('.')) return this.classes.has(selector.slice(1));
    const match = selector.match(/^(\w+)?((?:\[[^\]]+\])*)$/);
    if(!match) throw Error('Unsupported QA selector: '+selector);
    const attrs = [...match[2].matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
    return (!match[1] || this.tagName === match[1]) && attrs.every(attr=>attr[2]===undefined ? attr[1] in this.attrs : this.attrs[attr[1]]===attr[2]);
  }
  querySelectorAll(selector) {
    const result=[];
    for(const child of this.children) if(child instanceof Element) {
      if(child.matches(selector)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
}
function app(reducedMotion) {
  const document = new Element('document'); document.activeElement = null;
  function fromJSON(node) {
    if(typeof node==='string') return node;
    const element = new Element(node.tag,node.attrs);element.ownerDocument=document;
    element.children=node.children.map(fromJSON);return element;
  }
  document.children=parsed.children.map(fromJSON);
  document.documentElement=document.querySelector('html');
  document.createElement=tag=>{const element=new Element(tag);element.ownerDocument=document;return element;};
  let serial=0;const timers=new Map();
  const window={matchMedia:()=>({matches:reducedMotion})};
  let instant = '2026-11-02T08:00:00Z';
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:[instant]));}}
  const context={document,window,Intl,Date:FixedDate,console,
    requestAnimationFrame:callback=>{callback();return ++serial;},cancelAnimationFrame(){},
    setTimeout:(callback,delay)=>{const id=++serial;timers.set(id,{callback,delay});return id;},
    clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'script.js'),'utf8'),context);
  const $=selector=>document.querySelector(selector),$$=selector=>document.querySelectorAll(selector);
  const choose=input=>{$$(`input[name="${input.name}"]`).forEach(other=>other.checked=false);input.checked=true;input.fire('change');};
  const flush=()=>{for(const [id,timer] of [...timers]) {timers.delete(id);assert.equal(timer.delay,100);timer.callback();}};
  return {document,window,$,$$,choose,flush,timers,setTime:value=>{instant=value;}};
}
const {document,window,$,$$,choose}=app(true);
assert.equal(window.salimReady,true);assert.equal($('#booking-app').hidden,false);
assert.equal($('[data-next="1"]').disabled,true);
choose($('input[value="coupe"]'));$('[data-next="1"]').fire('click');
assert.equal($('[data-panel="1"]').hidden,false);assert.equal(document.activeElement.id,'step-title-1');
const days=$$('input[name="day"]');assert.equal(days.length,14);assert.equal(days.filter(day=>day.disabled).length,2);
choose(days.find(day=>!day.disabled));$('[data-next="2"]').fire('click');
const slots=$$('input[name="slot"]');assert(slots.some(slot=>slot.disabled));assert(slots.some(slot=>!slot.disabled));
choose(slots.find(slot=>!slot.disabled));$('[data-next="3"]').fire('click');
assert.equal(document.activeElement.id,'step-title-3');assert($('#form-recap').textContent.includes('25'));
$('[data-back="2"]').fire('click');assert.equal(document.activeElement.id,'step-title-2');
$('[data-next="3"]').fire('click');$('#booking-form').fire('submit');
assert.equal(document.activeElement.id,'first-name');assert($('#name-error').textContent.length>0);assert($('#phone-error').textContent.length>0);
$('#first-name').value='Exemple';$('#phone').value='06 00 00 00 00';$('#booking-form').fire('submit');
assert.equal($('[data-panel="4"]').hidden,false);assert.equal(document.activeElement.id,'step-title-4');
assert.equal($('#first-name').value,'');assert.equal($('#phone').value,'');
assert($('#booking-status').textContent.includes('Aucun rendez-vous'));assert($('#success-recap').textContent.includes('Coupe femme'));
$('#restart').fire('click');assert.equal($('[data-panel="0"]').hidden,false);assert.equal($('#summary-service').textContent,'À choisir');
$('[data-service="balayage"]').fire('click');assert.equal($('[data-panel="1"]').hidden,false);assert($('#summary-service').textContent.includes('120'));
choose($$('input[name="day"]').find(day=>!day.disabled));$('[data-back="0"]').fire('click');
choose($('input[value="keratine"]'));assert.equal($('#summary-date').textContent,'À choisir');assert.equal($('#summary-time').textContent,'À choisir');
const pointer=app(false);pointer.choose(pointer.$('input[value="coupe"]'));pointer.$('[data-next="1"]').fire('click');
assert.equal(pointer.timers.size,1);pointer.flush();assert.equal(pointer.document.activeElement.id,'step-title-1');
pointer.document.fire('keydown');pointer.$('[data-back="0"]').fire('click');
assert.equal(pointer.timers.size,0);assert.equal(pointer.document.activeElement.id,'step-title-0');
assert(pointer.document.documentElement.classList.contains('keyboard-mode'));
const expired=app(true);expired.choose(expired.$('input[value="coupe"]'));expired.$('[data-next="1"]').fire('click');
expired.choose(expired.$$('input[name="day"]').find(day=>!day.disabled));expired.$('[data-next="2"]').fire('click');
expired.choose(expired.$$('input[name="slot"]').find(slot=>!slot.disabled));expired.$('[data-next="3"]').fire('click');
expired.$('#first-name').value='Exemple';expired.$('#phone').value='06 00 00 00 00';expired.setTime('2026-11-02T22:00:00Z');
expired.$('#booking-form').fire('submit');assert.equal(expired.$('[data-panel="2"]').hidden,false);
assert.equal(expired.document.activeElement.id,'step-title-2');assert(expired.$('#slot-error').textContent.includes('maintenant passé'));
assert.equal(expired.$('#summary-time').textContent,'À choisir');
console.log('PASS: actual HTML/event flow, 14 days and Sunday closure, simulated occupied slots, recap, back, field errors/focus, success/no retained contact data, restart, menu preselection, changed service invalidation, pointer/keyboard transitions, expired-slot validation and focus.');
