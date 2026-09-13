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
 assert.equal(run('developments.every(d=>d.homes.length===20 && d.gapMeters>=0 && d.gapMeters<=1609)'),true);
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
console.log('PASS: 12 randomized worlds, 80 suburban homes, directed connectivity, local/cross-region routes, capacity, road-only vehicle positions, completed rides, train events and reset.');

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
