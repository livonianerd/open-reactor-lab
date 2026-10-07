// Dimensionless teaching model. Coefficients are illustrative, not fitted plant data.
export const reactors = [
 {id:'pwr',name:'Pressurized water reactor',subtitle:'Pressurized-water reactor',core:'Fuel rods / water',loop:'Primary water → steam generator',passive:.10,inertia:90,feedback:-.3,note:'Separate primary and secondary water loops. Emergency cooling and backup power vary by plant.'},
 {id:'bwr',name:'Boiling water reactor',subtitle:'Boiling-water reactor',core:'Fuel rods / boiling water',loop:'Steam → turbine → condenser',passive:.10,inertia:85,feedback:-.4,note:'Steam is produced in the reactor vessel. Increased steam voids tend to reduce power in this simplified model.'},
 {id:'rbmk',name:'High-power channel reactor',subtitle:'Historical Chernobyl-type concept',core:'Graphite / water channels',loop:'Pressure channels → steam separator',passive:.04,inertia:100,feedback:.65,note:'Illustrates positive void feedback in a historical configuration. This is not a reconstruction of the Chernobyl accident or a model of all high-power channel reactors.'},
 {id:'msr',name:'Molten salt reactor',subtitle:'Liquid-fuel salt / freeze plug',core:'Circulating liquid fuel salt',loop:'Salt → heat exchanger',passive:.24,inertia:120,feedback:-.5,note:'One conceptual liquid-fuel molten salt reactor with a freeze plug and drain tank. Drain success and continued tank cooling matter; these features are not universal to molten salt reactors.'},
 {id:'pebble',name:'Pebble-bed high-temperature gas reactor',subtitle:'TRISO pebbles / helium',core:'TRISO pebbles / graphite',loop:'Helium → heat exchanger',passive:.30,inertia:180,feedback:-.6,note:'Helium transports heat from a graphite pebble core. Passive heat rejection is finite and depends on an available heat sink.'}
];
export const scenarios={normal:'Normal operation',blackout:'Station blackout',flow:'Loss of forced flow',coolant:'Coolant inventory loss',sink:'Loss of heat sink',shutdown:'Shutdown unavailable',drain:'Molten salt reactor drain unavailable',fukushima:'Fukushima-inspired cooling loss',chernobyl:'Chernobyl-inspired overheating'};
export const modelsMeltdown=r=>['pwr','bwr','rbmk'].includes(r.id);
export const meltdownIndex=3; // Fictional teaching threshold, not a physical damage limit.
export const containmentDamageIndex=3; // Fictional vessel/tank damage threshold.
export const defaults={power:70,cooling:100,sink:100,response:5,passive:true};
export function createState(){return {time:0,power:0,temp:1,inventory:1,decay:0,removal:0,shutdownAt:null,shutdownReason:null,feedbackFactor:1,drained:false,drainFraction:0,drainTemp:0,protection:null,meltdownAt:null,vesselDamageAt:null,tankDamageAt:null,flooded:false,events:[],history:[],failures:{},scenario:'normal',peak:1};}
export const hasFailure=(s,key)=>Object.hasOwn(s.failures,key);
export const failureNames=s=>Object.keys(s.failures).map(key=>scenarios[key]).join(' + ')||scenarios.normal;
export function inject(s,scenario){
 if(!Object.hasOwn(scenarios,scenario))throw Error('Unknown scenario');
 if(scenario==='normal'||hasFailure(s,scenario))return false;
 s.failures[scenario]=s.time;s.scenario=scenario;
 if(s.faultAt===undefined)s.faultAt=s.time;
 s.events.push({time:s.time,text:scenarios[scenario]+' added; active failures persist until reset'});
 if(scenario==='fukushima'){
  if(!hasFailure(s,'shutdown'))scram(s,'Automatic shutdown');
  s.events.push({time:s.time,text:hasFailure(s,'shutdown')?'Earthquake-inspired event; automatic shutdown unavailable':'Earthquake-inspired shutdown requested; existing failures remain active'});
 }
 if(scenario==='drain' && s.drained)s.events.push({time:s.time,text:'Drain already open: added drain fault cannot reverse transferred fuel'});
 if(scenario==='shutdown' && s.shutdownAt!==null)s.events.push({time:s.time,text:'Shutdown already initiated: added shutdown fault cannot restart fission'});
 return true;
}
export function scram(s,reason='Manual shutdown'){if(s.shutdownAt===null){s.shutdownAt=s.time;s.shutdownReason=reason;s.events.push({time:s.time,text:reason+' initiated; residual heat remains'});}}
export function openDrain(s,r,manual=false){
 if(r.id!=='msr'||s.drained)return false;
 if(!manual && hasFailure(s,'drain'))return false;
 s.drained=true;scram(s,'Drain-induced shutdown');
 s.events.push({time:s.time,text:manual?'Manual drain override: plug forced open; fuel starts flowing to drain tank':'Illustrative freeze plug opens: fuel starts flowing to drain tank'});
 return true;
}
export function powerExplanation(s){
 if(s.shutdownAt!==null)return (s.shutdownReason||'Shutdown')+' at '+s.shutdownAt.toFixed(0)+'s. Adding shutdown unavailable afterward cannot restart fission.';
 if(s.feedbackFactor<.999)return 'Temperature feedback is reducing fission without a shutdown. Low fission power does not establish a safe state; this simplified model only adds residual heat after a recorded shutdown.';
 return hasFailure(s,'shutdown')?'Automatic shutdown blocked. Fission still responds to temperature feedback and cooling.':'Fission follows the power setting and temperature feedback.';
}
export const formatPower=power=>power>0 && power<.0005?'<0.05%':(power*100).toFixed(1)+'%';
export function protectionStatus(s,r,p){
 const sink=p.sink>0 && !hasFailure(s,'sink') && !(hasFailure(s,'fukushima') && s.flooded);
 const cooling=p.passive && sink;
 if(s.meltdownAt!==null || s.vesselDamageAt!==null || s.tankDamageAt!==null || s.temp>=2 || s.drainTemp>=2 || s.shutdownAt===null || s.power>=.001 || !cooling)return null;
 const heat=s.power+s.decay;
 if(r.id==='msr' && s.drainFraction>=1 && heat<.3*p.sink/100 && heat*.05<=s.removal*s.temp)return 'drained';
 if(r.id==='pebble' && Object.keys(s.failures).length>0 && s.time-s.faultAt>=30 && heat<=s.removal*s.temp)return 'passive';
 return null;
}
export function step(s,r,p,dt=1){
 if(!Number.isFinite(dt)||dt<=0||dt>1)throw Error('Use fixed steps of at most 1 teaching second');
 s.time+=dt;
 const fault=Object.keys(s.failures).length>0;
 const chernobyl=hasFailure(s,'chernobyl') && r.id==='rbmk';
 if(fault && !chernobyl && !hasFailure(s,'shutdown') && s.time-s.faultAt>=p.response && s.shutdownAt===null)scram(s,'Automatic shutdown');
 const flooded=hasFailure(s,'fukushima') && s.time-s.failures.fukushima>=20;
 if(flooded && !s.flooded){s.flooded=true;s.events.push({time:s.time,text:'Flood-inspired loss of backup power and heat sink; residual heat remains'});}
 const powered=!hasFailure(s,'blackout') && !flooded;
 const flow=!chernobyl && powered && !hasFailure(s,'flow')?p.cooling/100:0;
 if(hasFailure(s,'coolant'))s.inventory=Math.max(.05,s.inventory-.002*dt);
 const sink=(hasFailure(s,'sink')||flooded||chernobyl)?0:p.sink/100;
 if(r.id==='msr' && fault && p.passive && !hasFailure(s,'drain') && s.time-s.faultAt>=20 && !s.drained)openDrain(s,r);
 if(s.drained)s.drainFraction=Math.min(1,s.drainFraction+dt/10);
 const demand=p.power/100;
 const feedback=r.feedback*Math.max(0,s.temp-1)*(1-s.inventory*.5);
 s.feedbackFactor=Math.max(0,1+feedback);
 const target=s.shutdownAt!==null?0:Math.max(0,Math.min(2,demand*(1+feedback)));
 s.power+=(target-s.power)*Math.min(1,dt/3);
 s.decay=s.shutdownAt===null?0:demand*.07/Math.pow(1+(s.time-s.shutdownAt)/30,.3);
 s.removal=(flow*s.inventory+(p.passive?r.passive:0))*sink;
 const heat=s.power+s.decay;
 // Invented boil-off and inventory response for the teaching scenario only.
 if(flooded)s.inventory=Math.max(.05,s.inventory-heat*.025*dt);
 // Temperature index has ambient=0, normal reference=1; no physical temperature units.
 s.temp=Math.max(0,s.temp+(heat*(1-.95*s.drainFraction)-s.removal*s.temp)*dt/(r.inertia*(flooded?s.inventory:1)));
 if(s.drained)s.drainTemp=Math.max(0,s.drainTemp+(heat*s.drainFraction-(p.passive?.3:0)*sink*s.drainTemp)*dt/90);
 if(modelsMeltdown(r) && s.temp>=meltdownIndex && s.meltdownAt===null){s.meltdownAt=s.time;scram(s,'Illustrative damage shutdown');s.events.push({time:s.time,text:'Illustrative meltdown: fictional damage threshold reached; damage persists until reset'});}
 if(r.id==='msr'){
  if(s.temp>=containmentDamageIndex && s.vesselDamageAt===null){s.vesselDamageAt=s.time;s.events.push({time:s.time,text:'Vessel damaged / fuel containment lost: fictional temperature threshold crossed; damage persists until reset'});}
  if(s.drainFraction>0 && s.drainTemp>=containmentDamageIndex && s.tankDamageAt===null){s.tankDamageAt=s.time;s.events.push({time:s.time,text:'Drain tank damaged / fuel containment lost: fictional temperature threshold crossed; damage persists until reset'});}
 }
 const protection=protectionStatus(s,r,p);
 if(protection!==s.protection){
  if(protection)s.events.push({time:s.time,text:protection==='drained'?'Safe state in this simulation: fuel drained; tank cooling available':'Overheating avoided in this simulation: shutdown and passive heat removal'});
  else if(s.protection)s.events.push({time:s.time,text:'Protected-state conditions no longer met; monitor heat and cooling'});
  s.protection=protection;
 }
 s.peak=Math.max(s.peak,s.temp,s.drainTemp);
 if(s.time%5<dt){s.history.push({time:s.time,power:s.power,temp:s.temp,decay:s.decay,removal:s.removal,drain:s.drainTemp,meltdown:s.meltdownAt!==null,vesselDamage:s.vesselDamageAt!==null,tankDamage:s.tankDamageAt!==null,failures:Object.keys(s.failures).join('|')||'normal'});if(s.history.length>1200)s.history.shift();}
 return s;
}
