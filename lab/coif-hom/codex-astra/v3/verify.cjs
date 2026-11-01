/* Vérification reproductible du moteur de créneaux, sans navigateur. */
const assert = require('node:assert/strict');
const path = require('node:path');
const core = require(path.resolve(process.argv[2] || path.join(__dirname, 'script.js')));
const { SERVICES,HOURS,parisNow,plusDays,holiday,slotsFor,validMobile } = core;
assert.deepEqual(parisNow(new Date('2026-10-25T00:30:00Z')), {date:'2026-10-25',minute:150});
assert.deepEqual(parisNow(new Date('2026-10-25T01:30:00Z')), {date:'2026-10-25',minute:150});
assert.deepEqual(parisNow(new Date('2026-11-01T23:15:00Z')), {date:'2026-11-02',minute:15});
assert.equal(plusDays('2026-12-31',1),'2027-01-01');
assert.equal(plusDays('2028-02-28',1),'2028-02-29');
assert.equal(holiday('2027-03-29'),'Lundi de Pâques');
assert.equal(holiday('2027-05-06'),'Ascension');
assert.equal(holiday('2027-05-17'),'Lundi de Pentecôte');
assert.equal(holiday('2026-11-11'),'11 Novembre');
assert.equal(holiday('2026-11-10'),'');
const now={date:'2026-11-01',minute:720};
let tested=0;
for(let i=0;i<366;i++) {
  const day=plusDays(now.date,i),weekDay=new Date(day+'T12:00:00Z').getUTCDay();
  for(const id of Object.keys(SERVICES)) {
    const slots=slotsFor(day,id,now);
    assert.deepEqual(slots,slotsFor(day,id,now));
    if(!HOURS[weekDay]) assert.equal(slots.length,0);
    else {
      assert.ok(slots.some(s=>!s.disabled),'Each open future day has options');
      assert.ok(slots.some(s=>s.reason==='Déjà pris'),'Deterministic unavailable slots');
      for(const s of slots) {
        assert.ok(s.minute>=HOURS[weekDay][0]);
        assert.ok(s.minute+SERVICES[id].duration<=HOURS[weekDay][1]);
        assert.equal(s.minute%15,0);tested++;
      }
    }
  }
}
assert.ok(slotsFor('2026-11-03','duo',{date:'2026-11-03',minute:1095}).every(s=>s.disabled));
assert.ok(slotsFor('2026-11-07','duo',now).every(s=>s.minute<=975));
assert.ok(slotsFor('2026-11-06','duo',{date:'2026-11-07',minute:0}).every(s=>s.disabled));
assert.ok(slotsFor('2026-11-03','coupe',{date:'2026-11-03',minute:600}).filter(s=>s.minute<=600).every(s=>s.reason==='Passé'));
for(const phone of ['06 12 34 56 78','07.12.34.56.78','+33 6 12 34 56 78','0033 7 12 34 56 78']) assert.ok(validMobile(phone));
for(const phone of ['','01 12 34 56 78','+330612345678','061234','not-a-phone']) assert.ok(!validMobile(phone));
console.log(`PASS — ${tested} créneaux contrôlés sur 366 jours : fermetures, durées, samedi, passé, fuseau Paris/DST, fériés et validation mobile.`);
