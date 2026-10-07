import {test} from 'node:test';import assert from 'node:assert/strict';import {reactors,defaults,createState,step,inject,scram} from '../src/engine.js';
test('all scenarios remain finite and bounded below over long transients',()=>{for(const r of reactors)for(const scenario of ['normal','blackout','flow','coolant','sink','shutdown','drain','fukushima','chernobyl']){const s=createState();inject(s,scenario);for(let n=0;n<3600;n++)step(s,r,defaults);for(const k of ['power','temp','decay','inventory','drainTemp'])assert.ok(Number.isFinite(s[k])&&s[k]>=0,`${r.id}/${scenario}/${k}`);}});
test('shutdown preserves residual heat and reduces fission power',()=>{const s=createState();for(let n=0;n<30;n++)step(s,reactors[0],defaults);scram(s);for(let n=0;n<60;n++)step(s,reactors[0],defaults);assert.ok(s.power<.001);assert.ok(s.decay>0);});
test('response delay starts at injection, not application startup',()=>{const s=createState();for(let n=0;n<100;n++)step(s,reactors[0],defaults);inject(s,'blackout');step(s,reactors[0],defaults);assert.equal(s.shutdownAt,null);for(let n=0;n<4;n++)step(s,reactors[0],defaults);assert.equal(s.shutdownAt,105);});
test('MSR drain keeps tank heat; drain failure prevents transfer',()=>{for(const scenario of ['blackout','drain']){const s=createState();inject(s,scenario);for(let n=0;n<100;n++)step(s,reactors[3],defaults);assert.equal(s.drained,scenario==='blackout');if(s.drained)assert.ok(s.drainTemp>0);}});
test('loss of sink disables active and passive heat removal',()=>{const s=createState();inject(s,'sink');step(s,reactors[4],defaults);assert.equal(s.removal,0);});
test('deterministic repeatable comparison',()=>{const a=createState(),b=createState();inject(a,'flow');inject(b,'flow');for(let n=0;n<200;n++){step(a,reactors[1],defaults);step(b,reactors[1],defaults);}assert.deepEqual(a,b);});

test('RBMK demo reaches persistent fictional damage; reset clears it',()=>{
 const r=reactors.find(r=>r.id==='rbmk'),s=createState();
 const p={...defaults,power:100,cooling:0,sink:0,passive:false};inject(s,'shutdown');
 for(let n=0;n<300;n++)step(s,r,p);
 assert.notEqual(s.meltdownAt,null);assert.notEqual(s.shutdownAt,null);assert.ok(s.decay>0);
 const damagedAt=s.meltdownAt;
 for(let n=0;n<1000;n++)step(s,r,defaults);
 assert.ok(s.temp<3);assert.equal(s.meltdownAt,damagedAt);
 assert.equal(s.events.filter(e=>e.text.startsWith('Illustrative meltdown')).length,1);
 assert.ok(s.history.some(h=>h.meltdown));assert.equal(createState().meltdownAt,null);
});
test('normal RBMK operation stays intact and damage is scoped to solid-fuel water reactor presets',()=>{
 const s=createState();for(let n=0;n<3600;n++)step(s,reactors[2],defaults);
 assert.equal(s.meltdownAt,null);
 const p=createState();p.temp=4;step(p,reactors[4],defaults);assert.equal(p.meltdownAt,null);
});
test('manual drain overrides unavailable drain without requiring passive systems',async()=>{
 const {openDrain}=await import('../src/engine.js');const s=createState(),r=reactors[3];inject(s,'drain');
 assert.equal(openDrain(s,r),false);assert.equal(openDrain(s,r,true),true);
 assert.equal(s.drained,true);assert.equal(s.shutdownAt,0);
 const count=s.events.length;assert.equal(openDrain(s,r,true),false);assert.equal(s.events.length,count);
 for(let n=0;n<60;n++)step(s,r,{...defaults,passive:false,sink:0});
 assert.ok(s.drainTemp>0);assert.ok(s.decay>0);assert.equal(createState().drained,false);
 const other=createState();assert.equal(openDrain(other,reactors[0],true),false);assert.equal(other.drained,false);
});

test('Fukushima-inspired scenario shuts down before delayed cooling loss and residual-heat damage',()=>{
 const s=createState(),r=reactors[1];s.power=1;
 for(let n=0;n<50;n++)step(s,r,defaults);
 inject(s,'fukushima');assert.equal(s.shutdownAt,50);
 for(let n=0;n<19;n++)step(s,r,defaults);
 assert.ok(s.removal>0);assert.equal(s.flooded,false);
 step(s,r,defaults);assert.equal(s.flooded,true);assert.equal(s.removal,0);
 for(let n=0;n<10000 && s.meltdownAt===null;n++)step(s,r,defaults);
 assert.notEqual(s.meltdownAt,null);assert.ok(s.power<.001);assert.ok(s.decay>0);assert.ok(s.inventory<1);
 assert.equal(s.events.filter(e=>e.text.startsWith('Flood-inspired')).length,1);
 assert.ok(Number.isFinite(s.temp));assert.equal(createState().flooded,false);
 inject(s,'flow');step(s,r,defaults);assert.equal(s.removal,0);
});


test('high temperatures show persistent damage for PWR, BWR, and RBMK',()=>{
 for(const r of reactors.slice(0,3)){
  const s=createState();s.temp=63;step(s,r,defaults);assert.notEqual(s.meltdownAt,null,r.id);
  s.temp=1;step(s,r,defaults);assert.notEqual(s.meltdownAt,null);
 }
});
test('Chernobyl-inspired scenario overheats RBMK and records one damage event',()=>{
 const s=createState();inject(s,'chernobyl');
 for(let n=0;n<500;n++)step(s,reactors[2],defaults);
 assert.notEqual(s.meltdownAt,null);assert.equal(s.removal,0);
 assert.equal(s.events.filter(e=>e.text.startsWith('Illustrative meltdown')).length,1);
 assert.equal(createState().meltdownAt,null);
});

test('protection demos reach conditional success and revoke it when the sink fails',()=>{
 for(const id of ['msr','pebble']){
  const r=reactors.find(r=>r.id===id),s=createState(),p={...defaults,power:100};s.power=1;inject(s,'blackout');
  for(let n=0;n<19;n++)step(s,r,p);
  assert.equal(s.protection,null);
  if(id==='msr'){
   assert.equal(s.drained,false);step(s,r,p);assert.equal(s.drained,true);assert.ok(s.drainFraction>0 && s.drainFraction<1);
  }
  for(let n=0;n<150;n++)step(s,r,p);
  assert.equal(s.protection,id==='msr'?'drained':'passive');assert.ok(s.decay>0);
  if(id==='msr'){assert.equal(s.drainFraction,1);assert.ok(s.drainTemp>0);}
  inject(s,'sink');step(s,r,p);assert.equal(s.protection,null);
  assert.ok(s.events.some(e=>e.text.includes('conditions no longer met')));
  assert.equal(createState().protection,null);assert.equal(createState().drainFraction,0);
 }
});
test('no protected state is reported with passive cooling disabled',()=>{
 for(const id of ['msr','pebble']){
  const s=createState(),r=reactors.find(r=>r.id===id);s.power=1;inject(s,'blackout');
  for(let n=0;n<300;n++)step(s,r,{...defaults,passive:false});
  assert.equal(s.protection,null);
 }
});


test('blackout, drain fault, sink loss and shutdown failure compound',()=>{
 const s=createState(),r=reactors[3];
 for(const fault of ['drain','shutdown','blackout','sink'])inject(s,fault);
 for(let n=0;n<100;n++)step(s,r,defaults);
 assert.equal(Object.keys(s.failures).length,4);assert.equal(s.drained,false);
 assert.equal(s.shutdownAt,null);assert.equal(s.removal,0);assert.ok(s.power>0);
 assert.equal(s.protection,null);assert.deepEqual(createState().failures,{});
});
test('new and repeated failures do not postpone timers; history preserves past failure sets',()=>{
 const s=createState(),r=reactors[3];inject(s,'blackout');
 for(let n=0;n<4;n++)step(s,r,defaults);
 inject(s,'coolant');step(s,r,defaults);assert.equal(s.shutdownAt,5);
 const oldSample=s.history[0],events=s.events.length;assert.equal(inject(s,'blackout'),false);assert.equal(s.events.length,events);
 inject(s,'fukushima');
 while(s.time<20)step(s,r,defaults);
 assert.equal(s.drained,true);assert.equal(s.flooded,false);
 while(s.time<25)step(s,r,defaults);
 assert.equal(s.flooded,true);assert.equal(s.removal,0);
 assert.equal(oldSample.failures,'blackout|coolant');assert.match(s.history.at(-1).failures,/fukushima/);
});
test('shutdown fault blocks Fukushima scram but cannot undo existing shutdown',()=>{
 const s=createState();inject(s,'shutdown');inject(s,'fukushima');
 for(let n=0;n<30;n++)step(s,reactors[1],defaults);
 assert.equal(s.shutdownAt,null);scram(s);const time=s.shutdownAt;
 inject(s,'blackout');step(s,reactors[1],defaults);assert.equal(s.shutdownAt,time);
 const b=createState();inject(b,'fukushima');inject(b,'shutdown');assert.equal(b.shutdownAt,0);
});
test('all fault pairs remain finite and preserve both failures',()=>{
 const faults=['blackout','flow','coolant','sink','shutdown','drain','fukushima','chernobyl'];
 for(const r of reactors)for(const a of faults)for(const b of faults){
  const s=createState();inject(s,a);inject(s,b);
  for(let n=0;n<60;n++)step(s,r,defaults);
  assert.ok(Object.hasOwn(s.failures,a)&&Object.hasOwn(s.failures,b));
  for(const k of ['temp','power','decay','drainTemp','inventory'])assert.ok(Number.isFinite(s[k])&&s[k]>=0);
 }
});

test('pebble temperature feedback can suppress fission without an automatic shutdown',async()=>{
 const {powerExplanation,formatPower}=await import('../src/engine.js');
 const s=createState();s.power=1;inject(s,'shutdown');inject(s,'sink');
 for(let n=0;n<15000;n++)step(s,reactors[4],defaults);
 assert.equal(s.shutdownAt,null);assert.ok(s.power<.0005);assert.equal(s.meltdownAt,null);assert.equal(s.protection,null);
 assert.match(powerExplanation(s),/without a shutdown/);assert.equal(formatPower(.0001),'<0.05%');
});
test('shutdown causes distinguish automatic, manual and drain mechanisms',async()=>{
 const {openDrain}=await import('../src/engine.js');
 const a=createState();inject(a,'blackout');for(let n=0;n<5;n++)step(a,reactors[0],defaults);assert.equal(a.shutdownReason,'Automatic shutdown');
 inject(a,'shutdown');assert.equal(a.shutdownReason,'Automatic shutdown');
 const b=createState();inject(b,'shutdown');scram(b);assert.equal(b.shutdownReason,'Manual shutdown');
 const c=createState();inject(c,'shutdown');openDrain(c,reactors[3],true);assert.equal(c.shutdownReason,'Drain-induced shutdown');
});

test('blocked molten salt drain and lost sink damage the vessel without a synthetic scram',()=>{
 const s=createState(),r=reactors[3];
 for(const f of ['shutdown','drain','sink'])inject(s,f);
 for(let i=0;i<2000;i++)step(s,r,defaults);
 assert.notEqual(s.vesselDamageAt,null);assert.equal(s.tankDamageAt,null);assert.equal(s.shutdownAt,null);
 assert.equal(s.events.filter(e=>e.text.startsWith('Vessel damaged')).length,1);
 assert.ok(s.history.some(h=>h.vesselDamage));
});
test('residual heat damages an uncooled drain tank independently',()=>{
 const s=createState(),r=reactors[3];s.power=1;inject(s,'blackout');inject(s,'sink');
 for(let i=0;i<100000 && s.tankDamageAt===null;i++)step(s,r,defaults);
 assert.notEqual(s.tankDamageAt,null);assert.equal(s.vesselDamageAt,null);assert.equal(s.protection,null);
 for(let i=0;i<5;i++)step(s,r,defaults);
 assert.equal(s.events.filter(e=>e.text.startsWith('Drain tank damaged')).length,1);assert.ok(s.history.some(h=>h.tankDamage));
});
test('vessel and tank damage persist after cooling and block protection',async()=>{
 const {openDrain,protectionStatus}=await import('../src/engine.js');
 const r=reactors[3],s=createState();s.temp=3.1;step(s,r,defaults);const vesselAt=s.vesselDamageAt;
 openDrain(s,r,true);s.drainTemp=3.1;step(s,r,defaults);const tankAt=s.tankDamageAt;
 assert.notEqual(vesselAt,null);assert.notEqual(tankAt,null);
 for(let i=0;i<5000;i++)step(s,r,defaults);
 assert.ok(s.temp<2 && s.drainTemp<2);assert.equal(s.vesselDamageAt,vesselAt);assert.equal(s.tankDamageAt,tankAt);
 assert.equal(protectionStatus(s,r,defaults),null);
 assert.equal(createState().vesselDamageAt,null);assert.equal(createState().tankDamageAt,null);
});
test('empty tank and non-salt concepts do not get salt damage states',()=>{
 const empty=createState();empty.drainTemp=4;step(empty,reactors[3],defaults);assert.equal(empty.tankDamageAt,null);
 const other=createState();other.temp=4;other.drainTemp=4;step(other,reactors[4],defaults);
 assert.equal(other.vesselDamageAt,null);assert.equal(other.tankDamageAt,null);
});
