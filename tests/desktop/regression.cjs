exports.run=async function({mode}){
 const pet=window.cloudPet,s=pet.getScene(),d=pet.getDaily();d.setAuto(false);d.interrupt();s.acceptNeutral();s.setPaused(true);s.setWords(false);await s.prepareInteractions();
 if(mode==='regression'){
 s.setPaused(false);const startup=await pet.runChecks(),checks=[...startup.checks];d.setAuto(false);d.interrupt();
 for(const size of [100,150,300])for(const id of ['A10','A11']){
 s.setPosition(.5);s.fit(size);s.setPaused(false);const loaded=await d.forcePlay(id,{source:'trial-w15'});const a=d.inspect();checks.push({name:id+' '+size+' real desktop load/prewarm',pass:loaded&&!!a});if(!a)continue;
 for(const time of id==='A10'?[0,.73,.82,.939,1,6.8,7.43,7.65,7.799]:[0,.8,3.5,7.63,7.75,7.95]){a.time=time;a.lastRenderKey=null;d.render();checks.push({name:id+' '+size+' render '+time,pass:!d.state().dailyError});}
 await d.forcePlay('A13',{source:'trial-w15'});checks.push({name:id+' '+size+' interruption to A13',pass:d.inspect()?.id==='A13'});d.interrupt();checks.push({name:id+' '+size+' neutral cleanup',pass:s.getState().mode==='A01'&&!d.busy()});
 }
 return{pass:checks.every(c=>c.pass),checks,state:pet.getState()};
 }
 return{pass:false,error:'Unknown test mode'};};
