const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(new URL('../index.html',`file://${__filename}`),'utf8').split('<script>')[1].split('</script>')[0];
function boot() {
 const elements=new Map();
 const context=new Proxy({}, {get:(o,k)=>k==='measureText'?()=>({width:40}):k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 function el(){return {width:780,height:780,style:{},dataset:{},classList:{add(){},toggle(){}},setAttribute(){},append(){},appendChild(){},removeChild(){},addEventListener(t,f){this[t]=f;},getContext(){return context},getBoundingClientRect(){return {top:0,bottom:780,width:780,height:780,left:0}},value:'',textContent:'',innerHTML:'',children:[],scrollHeight:0};}
 const doc={getElementById(id){if(!elements.has(id)) elements.set(id,el());return elements.get(id)},querySelector(id){return this.getElementById(id)},createElement:el};
 const sandbox={document:doc,window:{innerHeight:900,performance:{},addEventListener(){}},navigator:{hardwareConcurrency:4},performance:{now:()=>0},setInterval(){},setTimeout(){},console,Math};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {run:s=>vm.runInContext(s,sandbox),elements};
}
for(let trial=0;trial<12;trial++) {
 const {run,elements}=boot();
 assert.equal(run('GRID_N-1'),6);
 assert.equal(run('developments.every(d=>d.homes.length===24 && d.gapMeters>=0 && d.gapMeters<=1609)'),true);
 assert.equal(run('BUILDINGS.every(b=>dijkstra(CENTRAL_NODE,b.accessId) && dijkstra(b.accessId,CENTRAL_NODE))'),true);
 assert.equal(run('Object.values(edges).every(e=>Number.isFinite(e.length)&&e.length>0)'),true);
 run('render=()=>{};renderCockpit=()=>{};renderMetricsGraph=()=>{};dbg=()=>{};speedMult=20;');
 run(`for(let t=0;t<120;t++){ tick(); for(const c of cars){
   if(!Number.isFinite(c.pos.x)||!Number.isFinite(c.pos.y))throw Error('invalid position');
   if(c.riders.length>c.capacity)throw Error('capacity exceeded');
   if(c.route && c.routeIndex<c.route.edges.length){
    const a=nodeXY(c.route.nodes[c.routeIndex]),b=nodeXY(c.route.nodes[c.routeIndex+1]);
    const cross=(c.pos.x-a[0])*(b[1]-a[1])-(c.pos.y-a[1])*(b[0]-a[0]);
    if(Math.abs(cross)>1e-5)throw Error('vehicle off roadway');
   }
 }}`);
 assert.ok(run('completedTrips.length')>0);
 assert.equal(run('eventSchedule.filter(e=>e.pickup==="Central Stn").every(e=>e.fired)'),true);
 elements.get('reset').click();
 assert.equal(run('eventSchedule.some(e=>e.fired)'),false);
 assert.equal(run('completedTrips.length'),0);
 // Every neighborhood supports a local interactive trip and a cross-region trip.
 run(`for(const d of developments){ const routes=kShortest(d.homes[0].accessId,d.homes[19].accessId);if(!routes.length)throw Error('local route missing'); }
 if(!kShortest(developments[0].homes[0].accessId,developments[3].homes[19].accessId).length)throw Error('regional route missing');`);
}
console.log('PASS: 12 randomized worlds, 120 suburban homes, directed connectivity, local/cross-region routes, capacity, road-only vehicle positions, completed rides, train events and reset.');

// Rendering must follow CSS size × DPR without changing logical coordinates,
// reallocating unchanged buffers, or scaling a low-resolution cockpit image.
{
 const {run}=boot();
 run(`
   const probe={_width:0,_height:0,writes:0,transform:[],
     get width(){return this._width},set width(v){this._width=v;this.writes++},
     get height(){return this._height},set height(v){this._height=v;this.writes++},
     getContext(){return {setTransform:(...args)=>this.transform=args}}};
   for(const [width,height,dpr] of [[1900,1900,2],[350,350,3],[1024.5,1024.5,1.25],[640,480,1]]) {
     window.devicePixelRatio=dpr;
     sizeDrawingSurface(probe,780,780,{width,height});
     if(probe.width!==Math.round(width*dpr)||probe.height!==Math.round(height*dpr)) throw Error('wrong pixel resolution');
     if(probe.transform[0]!==probe.width/780||probe.transform[3]!==probe.height/780) throw Error('wrong logical transform');
     const writes=probe.writes;
     sizeDrawingSurface(probe,780,780,{width,height});
     if(probe.writes!==writes) throw Error('unnecessary buffer allocation');
   }
   window.devicePixelRatio=3;
   renderCockpit();
   if(fpvCanvas.width!==cockpitCanvas.width || fpvCanvas.height!==cockpitCanvas.height) throw Error('cockpit upsampled');
   if(FPV_W!==640 || FPV_H!==640) throw Error('projection coordinates changed');
   // Pointer selection remains in logical coordinates at the new resolution.
   mode='interactive';
   const centerView=mapViews.find(v=>v.id==='center');
   const building=BUILDINGS[0], point=buildingCenter(building);
   handleMapClick({clientX:point[0]*centerView.scale+centerView.tx,
     clientY:point[1]*centerView.scale+centerView.ty},centerView);
   if(ix.source!==building) throw Error('high-DPI picking broken');
 `);
}
console.log('PASS: Retina/phone/fractional DPR sizing, unchanged-buffer reuse, native cockpit rendering and map picking.');

{
 const {run,elements}=boot();
 assert.equal(run('countCars("bus")'),5);
 assert.equal(run('developments.every((_,i)=>cars.filter(c=>c.kind==="bus"&&c.development===i&&c.capacity===20&&c.color===COLORS.bus).length===1)'),true);
 run(`
   humans.length=0; queue.length=0;
   cars.splice(0,cars.length,...cars.filter(c=>c.kind==='bus'));
   const home=developments[0].homes[0],school=buildingByName('Hillside');
   function request(from,to){return {id:nextReqId++,human:{id:-1},from,to,pickupId:from.accessId,dropoffId:to.accessId,requestedAt:simMinute};}
   for(let i=0;i<25;i++) queue.push(request(home,school));
   queue.push(request(school,home));
   queue.push(request(developments[1].homes[0],developments[1].homes[2]));
   queue.push(request(developments[1].homes[0],developments[2].homes[0]));
   dispatch();
   const serviceBus=cars.find(c=>c.development===0);
   if(serviceBus.pickupQueue.length!==20) throw Error('bus must pool 20 passengers');
   if(cars.filter(c=>c.state!=='idle').length!==1) throw Error('wrong neighborhood bus dispatched');
   if(queue.length!==8) throw Error('opposite direction/local/cross-region demand should remain queued');
   for(let t=0;t<2000 && serviceBus.state!=='idle';t++) {stepCars(20);tickStoplights();
     if(serviceBus.riders.length>20) throw Error('bus over capacity');
   }
   if(completedTrips.length!==20) throw Error('bus did not complete full load');
   queue.splice(0,queue.length,...queue.filter(r=>r.from===school));
   dispatch();
   if(serviceBus.pickupQueue.length!==1 || serviceBus.pickupQueue[0].to!==home) throw Error('outbound service missing');
   addCars('bus',1);
   if(cars.filter(c=>c.kind==='bus'&&c.development===0).length!==2) throw Error('extra bus not balanced');
   removeCars('bus',1);
   if(countCars('bus')!==5) throw Error('bus control count wrong');
   // Request retirement of the busy bus after removing other neighborhoods.
   for(const c of cars) if(c!==serviceBus)c.retiring=true;
   retireFinishedBuses();
   removeCars('bus',1);
   if(!serviceBus.retiring || !cars.includes(serviceBus)) throw Error('busy bus must finish service');
   if(countCars('bus')!==0) throw Error('retiring bus should not count as available');
   for(let t=0;t<2000 && cars.includes(serviceBus);t++){stepCars(20);tickStoplights();retireFinishedBuses();}
   if(completedTrips.length!==21 || cars.includes(serviceBus)) throw Error('retirement lost rider or failed');
   if(Object.values(edges).some(e=>e.claims.has(serviceBus.id))) throw Error('retired bus left road claims');
   addCars('bus',5);
   if(!developments.every((_,i)=>cars.filter(c=>c.kind==='bus'&&c.development===i).length===1)) throw Error('restored fleet must serve all neighborhoods');
 `);
 elements.get('sim-controls').click({target:{dataset:{act:'bus-inc'}}});
 assert.equal(run('countCars("bus")'),6);
 elements.get('sim-controls').click({target:{dataset:{act:'bus-dec'}}});
 assert.equal(run('countCars("bus")'),5);
 elements.get('reset').click();
 assert.equal(run('cars.filter(c=>c.kind==="bus").every(c=>c.capacity===20&&c.state==="idle")'),true);
}
console.log('PASS: five assigned buses, 20-rider pooling, inbound/outbound service, neighborhood restrictions, balanced fleet controls, safe retirement and reset.');

{
 const {run}=boot();
 run(`
   dbg=()=>{};humans.length=0;queue.length=0;
   const sharingBus=cars.find(c=>c.kind==='bus'&&c.development===0);
   const home=developments[0].homes[0],hub=buildingByName('Central Stn');
   const original={id:nextReqId++,human:{id:-1},from:hub,to:home,pickupId:hub.accessId,dropoffId:home.accessId,requestedAt:simMinute};
   assignMultiStop(sharingBus,[original],'TEST');
   // Complete boarding, then sample an exact mid-edge position.
   for(let i=0;i<100 && sharingBus.state!=='enroute_dropoff';i++)stepCars(1,sharingBus);
   stepCars(1,sharingBus);
   const before={...sharingBus.pos};
   const back={id:nextReqId++,human:{id:-1},from:home,to:hub,pickupId:home.accessId,dropoffId:hub.accessId,requestedAt:simMinute};
   queue.push(back);
   rideSharing=0;
   if(tryShareRide(sharingBus)) throw Error('baseline sharing must be off');
   rideSharing=100;
   if(!tryShareRide(sharingBus)) throw Error('return rider should be admitted while delivering outbound rider');
   if(Math.hypot(sharingBus.pos.x-before.x,sharingBus.pos.y-before.y)>1e-8) throw Error('sharing teleported vehicle');
   if(queue.length || !sharingBus.pickupQueue.includes(back)) throw Error('request ownership incorrect');
   if(!sharingCapacity(sharingBus,[sharingBus._activeSeg,...sharingBus._segments])) throw Error('capacity invalid');
   for(let t=0;t<3000 && sharingBus.state!=='idle';t++){stepCars(20,sharingBus);tickStoplights();}
   if(completedTrips.length!==2 || sharingBus.nodeId!==CENTRAL_NODE) throw Error('original and return riders must arrive at correct stops');
   if(sharingBus.pickupQueue.length || sharingBus.riders.length) throw Error('sharing left passengers behind');
   // An empty returning shuttle can also collect along its current road.
   const shuttle=cars.find(c=>c.kind==='shuttle');
   shuttle.nodeId=home.accessId;shuttle.pos={x:nodeXY(home.accessId)[0],y:nodeXY(home.accessId)[1]};
   setRoute(shuttle,dijkstra(shuttle.nodeId,CENTRAL_NODE));shuttle.state='returning';
   const next=shuttle.route.nodes[1];
   const curb={name:'Roadside test stop',accessId:next,development:0};
   const ride={...back,id:nextReqId++,from:curb,pickupId:next,pickedUpAt:undefined,completedAt:undefined};queue.push(ride);
   if(!tryShareRide(shuttle)) throw Error('returning shuttle ignored on-route pickup');
   for(let t=0;t<3000 && shuttle.state!=='idle';t++){stepCars(20,shuttle);tickStoplights();}
   if(completedTrips.length!==3) throw Error('shuttle rider not delivered');
   if(Object.values(edges).some(e=>e.claims.has(shuttle.id))) throw Error('sharing left stale claims');
   // Promised pickups consume capacity, not just people already aboard.
   const fullStops=[{type:'pickup',reqs:Array.from({length:9},()=>({}))},{type:'dropoff',reqs:Array.from({length:9},()=>({}))}];
   if(sharingCapacity(shuttle,fullStops)) throw Error('overbooked shuttle');
   sharingBus.retiring=true;queue.push({...back,id:nextReqId++});
   if(tryShareRide(sharingBus)) throw Error('retiring bus accepted rider');
   sharingBus.retiring=false;
   if(busDirection(sharingBus,{from:developments[1].homes[0],to:hub}))throw Error('wrong neighborhood allowed');
 `);
}
console.log('PASS: baseline off, mid-edge continuity, outbound-to-return insertion, returning shuttle pickup, promised capacity, rider delivery and claim cleanup.');
{
 const {run}=boot();
 run(`
   render=()=>{};renderCockpit=()=>{};renderMetricsGraph=()=>{};dbg=()=>{};
   addHumans(400);rideSharing=100;speedMult=20;
   for(let t=0;t<160;t++) {
     tick();
     const assigned=new Set();
     for(const car of cars){
       if(car.riders.length>car.capacity)throw Error('over capacity in busy shared simulation');
       for(const r of [...car.pickupQueue,...car.riders]) {
         if(assigned.has(r.id))throw Error('duplicate assignment');assigned.add(r.id);
       }
       if(car.route && car.routeIndex<car.route.edges.length){
         const a=nodeXY(car.route.nodes[car.routeIndex]),b=nodeXY(car.route.nodes[car.routeIndex+1]);
         const cross=(car.pos.x-a[0])*(b[1]-a[1])-(car.pos.y-a[1])*(b[0]-a[0]);
         if(Math.abs(cross)>1e-5)throw Error('shared car off road');
       }
     }
     if(queue.some(r=>assigned.has(r.id)))throw Error('queued rider also assigned');
   }
   if(!sharedPickups || !completedTrips.length)throw Error('sharing never ran');
 `);
}
console.log('PASS: 500-person shared simulation, road continuity, capacity, exclusive request ownership and completed rides.');
{
 const {run}=boot();
 assert.equal(run('developments.length'),5);
 assert.equal(run('developments[4].gapMeters'),0);
 assert.ok(run('nodeDist(developments[4].gate,developments[4].entry)')<=run('CELL'));
 assert.equal(run('developments.every(d=>d.culDeSacs.length===4 && d.culDeSacs.every(n=>d.homes.filter(b=>b.accessId===n).length===2))'),true);
 run(`
   const bus=cars.find(c=>c.kind==='bus');
   const from=developments[0].homes[0],to=buildingByName('Hillside');
   const group=Array.from({length:5},()=>({id:nextReqId++,human:{id:-1},from,to,pickupId:from.accessId,dropoffId:to.accessId,requestedAt:simMinute}));
   assignMultiStop(bus,group,'TRANSFER TEST');
   for(let t=0;t<3000 && bus.state!=='idle';t++){stepCars(20,bus);tickStoplights();}
   if(completedTrips.length!==5)throw Error('transfer trip not completed');
   if(passengerTransfers.filter(e=>e.boarding).length!==5 || passengerTransfers.filter(e=>!e.boarding).length!==5)throw Error('expected exactly one animation per passenger in each direction');
   for(const effect of passengerTransfers) {
     if(!transferPosition(effect,effect.start+325) || transferPosition(effect,effect.start-1) || transferPosition(effect,effect.start+651))throw Error('transfer lifetime incorrect');
   }
   passengerTransfers.length=0;
   for(const b of buildingsByType.residential) drawRanchFPV(b,{x:b.x||0,y:(b.y||0)-40,cos:1,sin:0});
 `);
}
console.log('PASS: fifth connected neighborhood within one block, two homes at every cul-de-sac, ranch rendering and exact per-person transfer effects.');
{
 const {run,elements}=boot();
 assert.equal(run('humans.length'),300);
 assert.equal(run('countCars("sedan")'),15);
 assert.equal(run('countCars("shuttle")'),14);
 assert.equal(run('countCars("bus")'),5);
 assert.equal(run('rideSharing'),100);
 assert.equal(run('buildingsByType.school.length'),1);
 assert.equal(run('buildingByName("Riverbend Apts").apartments'),100);
 assert.equal(run('buildingsByType.residential.includes(buildingByName("Riverbend Apts"))'),true);
 assert.equal(run('eventSchedule.every(e=>[e.pickup,e.dropoff].every(n=>n==="residential" || buildingByName(n)))'),true);
 assert.equal(elements.get('ctl-pop').textContent,300);
 assert.equal(elements.get('ctl-sed').textContent,15);
}
console.log('PASS: startup defaults and residential apartment/school event configuration.');
{
 const {run,elements}=boot();
 run(`
   const vehicle=makeCar('shuttle','timing-test');cars.splice(0,cars.length,vehicle);
   const from=buildingByName('Central Stn'),to=buildingByName('Hillside');
   const riders=[0,1].map(i=>({id:90000+i,from,to,pickupId:from.accessId,dropoffId:to.accessId,requestedAt:0}));
   assignMultiStop(vehicle,riders,'TIMING TEST');
   arriveAtRouteEnd(vehicle);
   simElapsed=120;stepCars(1,vehicle);
   simElapsed=122;stepCars(1,vehicle);
   stepCars(1,vehicle); // finish boarding and start dropoff segment
   simElapsed=140;vehicle.nodeId=to.accessId;arriveAtRouteEnd(vehicle);
   if(completedCount!==2 || completedRideMinutes!==38)throw Error('per-person boarding clocks incorrect');
   if(completedTrips[0].tripMin!==20 || completedTrips[1].tripMin!==18)throw Error('queue time included in ride duration');
   if(completePassenger(riders[0]))throw Error('passenger counted twice');
   updateHUD();
 `);
 assert.equal(elements.get('avg-trip').textContent,'19.0');
 run(`
   for(let i=0;i<1005;i++) {
     const request={requestedAt:simElapsed-200};boardPassenger(request);
     simElapsed+=10;completePassenger(request);
   }
   updateHUD();
   if(completedCount!==1007 || completedTrips.length!==1000)throw Error('completion counter capped with history');
   if(completedRideMinutes!==10088)throw Error('all-time ride sum incorrect');
   const midnightRider={requestedAt:simElapsed};boardPassenger(midnightRider);
   simMinute=1439;advanceSimulationTime(4);completePassenger(midnightRider);
   if(completedTrips.at(-1).tripMin!==4)throw Error('day rollover broke rider duration');
 `);
 assert.equal(elements.get('completed-rides').textContent,1007);
 elements.get('reset').click();run('updateHUD()');
 assert.equal(run('completedCount'),0);
 assert.equal(run('simElapsed'),0);
 assert.equal(elements.get('avg-trip').textContent,'—');
 assert.equal(elements.get('completed-rides').textContent,0);
}
console.log('PASS: distinct passenger boarding times, excluded queue time, 1000+ completions, bounded history, day rollover and clean metrics reset.');
