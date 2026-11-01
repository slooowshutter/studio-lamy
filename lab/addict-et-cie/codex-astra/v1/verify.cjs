/* Tests des règles métier, sans navigateur et sans réseau. */
const assert=require('node:assert/strict');
const R=require('./script.js');
assert.equal(R.parisNow(new Date('2026-11-01T23:30:00Z')).date,'2026-11-02');
assert.equal(R.parisNow(new Date('2026-07-01T22:30:00Z')).date,'2026-07-02');
assert.equal(R.parisNow(new Date('2026-10-25T01:30:00Z')).minutes,150);
assert.equal(R.holiday('2026-11-11'),true);
assert.equal(R.holiday('2027-03-29'),true);
assert.equal(R.holiday('2027-05-06'),true);
assert.equal(R.holiday('2027-05-17'),true);
assert.equal(R.slots('2026-11-01',30,{date:'2026-11-01',minutes:0}).length,0);
assert.equal(R.slots('2026-11-02',30,{date:'2026-11-01',minutes:0}).length,0);
assert.equal(R.slots('2026-11-11',30,{date:'2026-11-01',minutes:0}).length,0);
for(const duration of [20,30,60,90]) {
  const now={date:'2026-11-03',minutes:600};
  const days=R.days(duration,now);assert.equal(days.length,14);
  for(const d of days) {
    const range=R.hours[R.dateObject(d.key).getUTCDay()];
    const slots=R.slots(d.key,duration,now);
    for(const s of slots) {
      assert.ok(s.time>=range[0]);assert.ok(s.time+duration<=range[1]);
      if(d.key===now.date&&s.time<=now.minutes)assert.equal(s.disabled,true);
    }
    if(d.disabled)assert.ok(!slots.some(s=>!s.disabled));
    else assert.ok(slots.some(s=>!s.disabled));
  }
}
assert.ok(R.slots('2026-11-03',20,{date:'2026-11-03',minutes:1110}).every(s=>s.disabled));
assert.deepEqual(R.slots('2026-11-03',30,{date:'2026-11-03',minutes:0}),R.slots('2026-11-03',30,{date:'2026-11-03',minutes:0}));
for(const value of ['06 00 00 00 00','07.00.00.00.00','+33 6 00 00 00 00','0033 7 00 00 00 00'])assert.equal(R.mobileOK(value),true);
for(const value of ['0383327398','123','+1 555 555 5555','060000000000'])assert.equal(R.mobileOK(value),false);
assert.equal(R.timeLabel(1110),'18:30');
console.log('PASS : Paris, changement de date et heure, jours fermés et fériés, 14 jours, durées, passé, disponibilité déterministe, mobile français.');
