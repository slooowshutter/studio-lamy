'use strict';
document.documentElement.classList.add('js');
const services = [
  {id:'coupe-femme',name:'Shampoing, coupe, soin et coiffage'},
  {id:'transfo',name:'BIG TRANSFO'},
  {id:'coupe-homme',name:'Coupe homme'},
  {id:'coupe-barbe',name:'Coupe et barbe'},
  {id:'patine',name:'Patine, shampoing, soin et coiffage'}
];
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const content=document.querySelector('#booking-content');
content.innerHTML='<h3 class="step-heading">Choisir une prestation</h3><p class="step-intro">Choisissez une prestation puis appelez le salon pour prendre rendez-vous.</p><div class="options"></div><div class="booking-actions"><a class="button dark" href="tel:+33298470217">Appeler le salon ↗</a></div>';
const options=content.querySelector('.options');
function selectService(id){
  const service=services.find(item=>item.id===id);
  if(!service)return;
  document.querySelector('#sum-service').textContent=service.name;
  const input=options.querySelector(`input[value="${id}"]`);
  if(input) input.checked=true;
}
services.forEach(service=>{
  const label=document.createElement('label'); label.className='option';
  const input=document.createElement('input'); input.type='radio'; input.name='prestation'; input.value=service.id;
  const name=document.createElement('span'); name.textContent=service.name;
  label.append(input,name); options.append(label);
  input.addEventListener('change',()=>selectService(service.id));
});
document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{
  selectService(button.dataset.book);
  document.querySelector('#rendez-vous').scrollIntoView({behavior:reduced.matches?'auto':'smooth'});
}));
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('.price-row').forEach(row=>{const wasHidden=row.hidden;row.hidden=b.dataset.filter!=='tout'&&row.dataset.category!==b.dataset.filter;if(wasHidden&&!row.hidden&&!reduced.matches){row.classList.remove('filter-enter');void row.offsetWidth;row.classList.add('filter-enter');}});}));
if('IntersectionObserver' in window){
 const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target);}}),{threshold:.12});
 document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${i*60}ms`;revealObserver.observe(el);});
 document.documentElement.classList.add('reveal-ready');
 const bar=document.querySelector('.mobile-bar');
 const covered=new Set();
 const barObserver=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?covered.add(e.target):covered.delete(e.target));bar.classList.toggle('is-hidden',covered.size>0);},{threshold:0});
 [document.querySelector('#rendez-vous'),document.querySelector('footer')].forEach(el=>barObserver.observe(el));

}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));

