(() => {
'use strict';
document.documentElement.classList.add('js');
const services = [
 {id:'balneo',name:'Soin des pieds en balnéo'},
 {id:'mains',name:'Semi-permanent mains'},
 {id:'pieds',name:'Semi-permanent pieds'},
 {id:'gainage',name:'Gainage des ongles naturels'},
 {id:'extensions',name:'Extensions d’ongles'}
];
const content=document.querySelector('#booking-content');
const summary=document.querySelector('#booking-summary');
let selected=null;
function render(){
 content.innerHTML=`<div class="step-panel"><h3>Choisir une prestation.</h3><p>Pour connaître les horaires et les tarifs, appelez le salon au 06 63 67 07 29.</p><div class="options">${services.map(s=>`<label class="option"><input type="radio" name="service" value="${s.id}" ${selected===s.id?'checked':''}><span>${s.name}</span><strong>Sur appel</strong></label>`).join('')}</div><a class="next" href="tel:+33663670729">Appeler le salon →</a></div>`;
 const item=services.find(s=>s.id===selected);
 summary.textContent=item?item.name:'Votre choix apparaîtra ici.';
}
content.addEventListener('change',e=>{if(e.target.name==='service'){selected=e.target.value;summary.textContent=services.find(s=>s.id===selected).name;}});
document.querySelectorAll('[data-goto]').forEach((b,i)=>{b.disabled=i>0;if(i===0)b.setAttribute('aria-current','step');});
document.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>{selected=a.dataset.service;render();}));
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});document.querySelectorAll('.price-row').forEach(row=>row.hidden=b.dataset.filter!=='all'&&row.dataset.category!==b.dataset.filter)}));
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
render(false);
})();
