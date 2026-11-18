import {THREE,box,ell,petal,cyl,cone,beam,mesh,mat,gable,windowFront,windowSide,door,chimney,foundation,planter,flowerbox} from './building-kit.js';

// Sixty additional buildings; architectural families share construction details,
// while their footprints, roofs, wings and identifying structures remain distinct.
const sets={
 Homes:[
 ['alpine-a-frame','Alpine A-frame',8,7,7,'A steep triangular timber home with an entirely glazed front and a broad front deck.'],
 ['courtyard-bungalow','Courtyard bungalow',10,9,6,'Three low wings enclose a planted entrance court beneath tiled roofs.'],
 ['split-level-home','Split-level hillside home',9,8,8,'Two offset living volumes step upward beside a narrow glazed stairwell.'],
 ['stilt-retreat','Waterside stilt retreat',8,8,7,'A light timber retreat raised on sturdy stilts with a long railed veranda.'],
 ['double-gable-duplex','Double-gable duplex',10,7,8,'A pair of neighboring homes share a wall, each with its own porch and pitched roof.'],
 ['longhouse','Cedar longhouse',12,7,6,'A long cedar dwelling with a continuous veranda, stone chimney and deep roof overhangs.'],
 ['breezeway-home','Breezeway garden home',11,8,7,'Two contrasting wings connect through an open, sheltered garden breezeway.'],
 ['round-roof-home','Round-roof garden house',8,8,6,'A circular plaster home with a rounded copper roof, little porch and radial windows.'],
 ['rooftop-studio-home','Rooftop studio home',8,8,9,'A compact two-story house with a bright rooftop artist studio and a planted terrace.'],
 ['corner-bay-house','Corner-bay family house',9,8,9,'A generous family house with a polygonal corner bay, paired dormers and a sheltered side entrance.'],
 ],
 Shops:[
 ['tramstop-bistro','Tramstop bistro',10,6,5,'A long low bistro with rounded end windows, a deep striped canopy and small pavement tables.'],
 ['corner-pharmacy','Corner pharmacy',8,8,8,'A tidy two-story pharmacy with a prominent green cross, corner windows and a glazed entrance.'],
 ['music-shop','Melody music shop',7,7,8,'A narrow music shop with an oversized string-instrument sign and tall upper windows.'],
 ['cycle-repair','Cycle repair shop',9,7,6,'A practical bike workshop with a wide repair bay, wheel emblem and outdoor work stand.'],
 ['pet-supply-shop','Little paws supplies',8,7,7,'A cheerful animal-supply shop with a paw-shaped sign and a side display porch.'],
 ['noodle-house','Lantern noodle house',9,7,6,'A warm timber restaurant with deep eaves, hanging lanterns and a sculpted bowl sign.'],
 ['fish-market','Harbor fish market',10,8,6,'A broad fishmongers hall with a raised vented roof, glazed counter and covered display bins.'],
 ['textile-shop','Spindle textile shop',8,8,9,'A tall textile store with a projecting window bay and rolls of fabric under its striped awning.'],
 ['ceramics-shop','Clay courtyard shop',10,8,6,'A small pottery shop wraps a courtyard displaying tall jars and low bowls.'],
 ['hardware-store','Corner hardware store',11,8,8,'A robust hardware shop with a stepped parapet, timber racks and a large gear emblem.'],
 ],
 Towers:[
 ['slender-slab','Ribbon slab offices',10,7,27,'A thin office slab with offset service core, horizontal sunshades and a narrow rooftop garden.'],
 ['cross-braced-office','Lattice offices',10,9,25,'A blue-green office block wrapped in prominent diagonal structural braces.'],
 ['terrace-pyramid','Terrace pyramid residences',13,12,25,'Five gradually receding residential terraces form a planted urban pyramid.'],
 ['three-tower-court','Trinity office court',15,12,27,'Three different-height office towers rise around an open arrival courtyard and skybridge.'],
 ['oval-hotel','Oval terrace hotel',11,10,25,'An oval hotel with broad curved balconies and a low covered entrance pavilion.'],
 ['notched-office','Gateway office tower',13,10,27,'Two tall office wings connect above a large central notch, forming a dramatic elevated gateway.'],
 ['woven-tower','Woven garden tower',11,10,27,'Alternating timber frames and planted ledges give this office tower a woven profile.'],
 ['diamond-tower','Diamond glass tower',12,12,29,'A diamond-oriented glass tower rises from a square podium to a matching faceted crown.'],
 ['spiral-balconies','Spiral balcony apartments',11,11,26,'Balconies turn around a round central apartment tower, creating a rising spiral of terraces.'],
 ['lantern-slab','Lantern crown offices',12,9,29,'A broad limestone office slab supports a large glazed rooftop lantern and slim corner pinnacles.'],
 ],
 Civic:[
 ['art-museum','Garden art museum',15,11,9,'A low museum with a columned entrance, two gallery wings and a lantern-lit central hall.'],
 ['post-office','Meadow post office',12,9,8,'A brick post office with a clock gable, sorting-room wing and a covered public entrance.'],
 ['town-hall','Juniper town hall',14,10,10,'A formal civic hall with a raised central tower, arched entrance and two balanced wings.'],
 ['small-clinic','Neighborhood clinic',12,10,7,'An accessible low clinic with glazed waiting rooms, a green medical cross and a sheltered entrance.'],
 ['swimming-hall','Community swimming hall',16,12,9,'A glazed pool hall has a long curved roof, blue pool basin and a low changing-room wing.'],
 ['courthouse','Limestone courthouse',15,11,11,'A broad courthouse with a deep columned portico, pediment and a restrained central cupola.'],
 ['auditorium','Crescent auditorium',16,12,10,'A fan-shaped auditorium combines a curved rear hall with a glazed front foyer and broad canopy.'],
 ['transit-station','Neighborhood transit station',16,11,9,'A light station building shelters a long platform beneath repeated pointed roof bays.'],
 ['community-center','Community garden center',14,11,8,'Three linked rooms surround a welcoming plaza with a timber pergola and planted edges.'],
 ['planetarium','Little sky planetarium',14,13,10,'A large rounded dome rises behind a low entrance pavilion and a small orbital emblem.'],
 ],
 Industry:[
 ['delivery-depot','Parcel delivery depot',15,11,8,'Three loading bays and a narrow office wing frame a covered sorting apron.'],
 ['timber-mill','Creekside timber mill',15,11,9,'A sawtooth mill hall stands beside open timber racks and a tall dust-extraction stack.'],
 ['textile-factory','Spindle works',14,11,11,'A brick textile factory has tall repeated windows, paired chimneys and a glazed roof lantern.'],
 ['metal-foundry','Copper foundry',15,12,10,'A low foundry combines a steep central roof, broad furnace shed and two heavy extraction stacks.'],
 ['waterworks','Town waterworks',14,12,9,'A pumping house sits between cylindrical settling tanks, pipework and a small elevated reservoir.'],
 ['recycling-center','Circular materials center',16,12,8,'A long sorting shed has three colored collection bays and a rooftop service gantry.'],
 ['bus-garage','Transit maintenance garage',16,12,9,'A wide garage with four tall service doors connects to a two-level corner office.'],
 ['powerhouse','Riverside powerhouse',15,12,10,'A robust utility hall has tall vents, paired outdoor transformer banks and a low control room.'],
 ['harbor-packhouse','Harbor packing house',15,12,9,'A long waterside warehouse features a raised clerestory, loading canopy and stacks of pale crates.'],
 ['grain-terminal','Meadow grain terminal',16,13,10,'A compact grain complex joins four tall silos to a gabled processing shed and elevated conveyor.'],
 ],
 Landmarks:[
 ['striped-lighthouse','Moss harbor lighthouse',10,10,20,'A tapered coastal lighthouse rises above a small keepers cottage to a glazed beacon.'],
 ['garden-bell-tower','Garden bell tower',10,10,17,'An open bell chamber crowns a slender stone tower with a steep tiled cap.'],
 ['tiered-pavilion','Three-roof garden pavilion',12,11,13,'Three flared roofs stack above an open timber pavilion and carved stair platform.'],
 ['arched-gateway','Twin arch gateway',15,9,13,'Two stone towers frame a broad open gateway with a smaller upper viewing gallery.'],
 ['observatory','Hilltop observatory',13,12,12,'A rotating-looking slit dome sits above a circular observation hall and low entrance wing.'],
 ['canal-clock-turret','Canal clock turret',10,10,16,'A square clock turret features four clock faces, a copper cap and a small ground-level arcade.'],
 ['amphitheater','Meadow amphitheater',17,14,8,'Tiered semicircular seating surrounds a little stage beneath a sculptural canopy.'],
 ['botanical-dome','Botanical conservatory dome',15,14,11,'A broad glazed dome with visible ribs covers a lush planted interior and entrance porch.'],
 ['lookout-house','Timber lookout house',11,11,18,'A glazed lookout cabin perches on cross-braced timber legs above a wide railed platform.'],
 ['sun-gate-monument','Sun gate monument',14,10,16,'A tall open stone portal supports a golden sun disk above shallow ceremonial steps.'],
 ],
};
const records=Object.entries(sets).flatMap(([group,rows])=>rows.map((r,i)=>({id:'bldg-'+r[0],name:r[1],w:r[2],d:r[3],h:r[4],description:r[5],group,i})));
// Measured raw-mesh bounds, rounded outward with a small placement margin.
const MODEL_BOUNDS={
 "bldg-alpine-a-frame": [
  9.1,
  10.6,
  7.25
 ],
 "bldg-courtyard-bungalow": [
  11.1,
  10.1,
  5.55
 ],
 "bldg-split-level-home": [
  10.1,
  9.4,
  7.75
 ],
 "bldg-stilt-retreat": [
  9.1,
  12.6,
  7.35
 ],
 "bldg-double-gable-duplex": [
  11.1,
  10.1,
  8.15
 ],
 "bldg-longhouse": [
  13.1,
  10.5,
  6.35
 ],
 "bldg-breezeway-home": [
  12.1,
  9.4,
  7.75
 ],
 "bldg-round-roof-home": [
  9.1,
  10.1,
  6.15
 ],
 "bldg-rooftop-studio-home": [
  9.1,
  9.4,
  10.85
 ],
 "bldg-corner-bay-house": [
  10.1,
  11.1,
  9.85
 ],
 "bldg-tramstop-bistro": [
  13.2,
  9.8,
  3.65
 ],
 "bldg-corner-pharmacy": [
  9.1,
  10.7,
  6.65
 ],
 "bldg-music-shop": [
  8.1,
  9.7,
  8.55
 ],
 "bldg-cycle-repair": [
  10.1,
  10.6,
  4.65
 ],
 "bldg-pet-supply-shop": [
  12.5,
  10.3,
  5.95
 ],
 "bldg-noodle-house": [
  10.1,
  9.7,
  6.55
 ],
 "bldg-fish-market": [
  11.1,
  11.3,
  6.35
 ],
 "bldg-textile-shop": [
  9.1,
  10.7,
  9.55
 ],
 "bldg-ceramics-shop": [
  11.1,
  9.1,
  6.35
 ],
 "bldg-hardware-store": [
  12.1,
  10.9,
  7.95
 ],
 "bldg-slender-slab": [
  11.2,
  10.1,
  28.85
 ],
 "bldg-cross-braced-office": [
  11.1,
  12.1,
  25.85
 ],
 "bldg-terrace-pyramid": [
  14.1,
  15.1,
  26.75
 ],
 "bldg-three-tower-court": [
  16.1,
  15.1,
  27.65
 ],
 "bldg-oval-hotel": [
  12.1,
  13.1,
  24.65
 ],
 "bldg-notched-office": [
  14.1,
  13.1,
  27.85
 ],
 "bldg-woven-tower": [
  12.7,
  13.1,
  28.75
 ],
 "bldg-diamond-tower": [
  16.5,
  16.5,
  32.55
 ],
 "bldg-spiral-balconies": [
  12.1,
  14.1,
  28.25
 ],
 "bldg-lantern-slab": [
  13.1,
  12.1,
  31.15
 ],
 "bldg-art-museum": [
  16.1,
  14.9,
  10.15
 ],
 "bldg-post-office": [
  15.8,
  12.2,
  8.45
 ],
 "bldg-town-hall": [
  15.1,
  13.9,
  12.05
 ],
 "bldg-small-clinic": [
  13.1,
  13.2,
  6.05
 ],
 "bldg-swimming-hall": [
  17.1,
  14.9,
  8.25
 ],
 "bldg-courthouse": [
  16.1,
  14.9,
  12.45
 ],
 "bldg-auditorium": [
  17.1,
  16.7,
  7.55
 ],
 "bldg-transit-station": [
  17.2,
  12.3,
  8.15
 ],
 "bldg-community-center": [
  15.1,
  12.1,
  5.85
 ],
 "bldg-planetarium": [
  15.1,
  16.2,
  9.45
 ],
 "bldg-delivery-depot": [
  17.3,
  14.6,
  7.75
 ],
 "bldg-timber-mill": [
  16.1,
  14,
  10.75
 ],
 "bldg-textile-factory": [
  15.1,
  12.1,
  12.75
 ],
 "bldg-metal-foundry": [
  16.1,
  13.1,
  11.75
 ],
 "bldg-waterworks": [
  15.1,
  13.1,
  8.25
 ],
 "bldg-recycling-center": [
  17.1,
  13.1,
  8.15
 ],
 "bldg-bus-garage": [
  18.5,
  15.6,
  8.15
 ],
 "bldg-powerhouse": [
  16.1,
  17.4,
  6.85
 ],
 "bldg-harbor-packhouse": [
  17.3,
  15.8,
  9.45
 ],
 "bldg-grain-terminal": [
  17.1,
  14.1,
  11.15
 ],
 "bldg-striped-lighthouse": [
  11.1,
  11.1,
  21.45
 ],
 "bldg-garden-bell-tower": [
  11.1,
  11.1,
  19.35
 ],
 "bldg-tiered-pavilion": [
  13.2,
  14,
  11.65
 ],
 "bldg-arched-gateway": [
  16.1,
  10.1,
  13.45
 ],
 "bldg-observatory": [
  14.1,
  14.4,
  9.35
 ],
 "bldg-canal-clock-turret": [
  11.1,
  11.1,
  18.35
 ],
 "bldg-amphitheater": [
  18.1,
  15.1,
  5.05
 ],
 "bldg-botanical-dome": [
  16.1,
  16,
  9.55
 ],
 "bldg-lookout-house": [
  12.1,
  12.1,
  18.55
 ],
 "bldg-sun-gate-monument": [
  15.1,
  11.1,
  18.65
 ]
};
export const BUILDING_EXPANSION=records.map(c=>{const [w,d,h]=MODEL_BOUNDS[c.id]||[c.w+6,c.d+6,c.h+5];return {id:c.id,name:c.name,description:c.description,category:'Buildings',kind:'building',tags:`building architecture ${c.group.toLowerCase()} ${c.id.slice(5).replaceAll('-',' ')} ${c.description.toLowerCase()}`,radius:Math.hypot(w/2,d/2),height:h,footprint:{halfX:w/2,halfZ:d/2},buildingGroup:c.group,collection:'world-expansion'};});
const lookup=new Map(records.map(c=>[c.id,c]));
const tones=['cream','stone','sand','lightwood','terracotta'];
function wall(g,w,d,h,x=0,y=.36,z=0,tone='cream'){box(g,w,h,d,x,y+h/2,z,tone);}
function cap(g,w,d,y,x=0,z=0,tone='cream',th=.18){box(g,w+.2,th,d+.2,x,y,z,tone);}
function panes(g,w,d,h,x=0,y=.36,z=0,rows=2,tone='cream'){
 const gap=h/rows;for(let j=0;j<rows;j++){const yy=y+(j+.53)*gap,hh=Math.min(1.45,gap*.65);for(const side of [-1,1]){box(g,w-.8,hh,.07,x,yy,z+side*(d/2+.035),'darkglass');box(g,.07,hh,d-.8,x+side*(w/2+.035),yy,z,'darkglass');}cap(g,w,d,y+(j+1)*gap,x,z,tone,.12);}
 for(let k=0;k<=Math.max(2,Math.floor(w/1.8));k++){const n=Math.max(2,Math.floor(w/1.8)),xx=x-w/2+.2+k*(w-.4)/n;for(const side of [-1,1])box(g,.11,h,.1,xx,y+h/2,z+side*(d/2+.065),tone);}
 for(let k=1;k<Math.max(2,Math.floor(d/1.8));k++){const n=Math.max(2,Math.floor(d/1.8)),zz=z-d/2+.2+k*(d-.4)/n;for(const side of [-1,1])box(g,.1,h,.11,x+side*(w/2+.065),y+h/2,zz,tone);}
}
function glassBlock(g,w,d,h,x,y,z,rows=3,tone='cream'){wall(g,w,d,h,x,y,z,'glass');panes(g,w,d,h,x,y,z,rows,tone);}
function entry(g,z,w=1.3,x=0){door(g,x,z,.4,w,2.1,'darkwood');}
function canopy(g,w,z,y=3,x=0,tone='leafDark'){box(g,w,.17,1.65,x,y,z,tone,-.06);for(const xx of [x-w/2+.16,x+w/2-.16])box(g,.13,y-.4,.13,xx,(y+.4)/2,z+.55,'cream');}
function awning(g,w,z,y=2.9,x=0,tone='leafDark'){const n=Math.ceil(w/.55);for(let i=0;i<n;i++){const xx=x-w/2+(i+.5)*w/n;box(g,w/n,.1,1.2,xx,y,z,i%2?'cream':tone,-.15);box(g,w/n,.24,.08,xx,y-.19,z+.57,i%2?'cream':tone);}}
function windows(g,w,d,h,x=0,y=.36,z=0,rows=2){for(let j=0;j<rows;j++){const yy=y+(j+.58)*h/rows;for(let k=0;k<3;k++)windowFront(g,x-w*.3+k*w*.3,yy,z+d/2+.04,Math.min(1.2,w/5),Math.min(1.4,h/rows*.6));for(const side of [-1,1])for(const zz of [-d*.25,d*.25])windowSide(g,x+side*(w/2+.03),yy,z+zz,1,Math.min(1.4,h/rows*.6));}}
function roof(g,w,d,y,h=2,x=0,z=0,tone='roof'){gable(g,w+.45,d+.5,h,y,tone,x,z);}
function stairs(g,w,z,steps=3,x=0){for(let i=0;i<steps;i++)box(g,w,.16,1.8-i*.35,x,.08+i*.15,z+i*.08,'stone');}
function garden(g,x,y,z){planter(g,x,y,z,1.1,1.1);}
function rail(g,w,d,y,x=0,z=0){for(const side of [-1,1]){box(g,w,.06,.06,x,y+.7,z+side*d/2,'cream');box(g,.06,.06,d,x+side*w/2,y+.7,z,'cream');}for(const side of [-1,1])for(let xx=-w/2;xx<=w/2;xx+=1)box(g,.05,.7,.05,x+xx,y+.35,z+side*d/2,'iron');}
function disk(g,x,y,z,r,tone='yellow'){const d=cyl(g,r,r,.14,x,y,z,tone,20);d.rotation.x=Math.PI/2;return d;}
function clock(g,x,y,z,r=.7){disk(g,x,y,z,r,'cream');for(let i=0;i<12;i++){const a=i*Math.PI/6;box(g,.05,.12,.04,x+Math.sin(a)*r*.8,y+Math.cos(a)*r*.8,z+.09,'darkwood',0,0,-a);}beam(g,[x,y,z+.13],[x-.32,y+.23,z+.13],.04,'darkwood',true);beam(g,[x,y,z+.13],[x+.08,y+.45,z+.13],.035,'darkwood',true);}
function barrel(g,w,d,y,z=0,tone='glass'){
 const positions=[],indices=[],steps=16,r=w/2;for(let i=0;i<=steps;i++){const a=i*Math.PI/steps;positions.push(Math.cos(a)*r,y+Math.sin(a)*r,z-d/2,Math.cos(a)*r,y+Math.sin(a)*r,z+d/2);}for(let i=0;i<steps;i++){const n=i*2;indices.push(n,n+2,n+3,n,n+3,n+1);}const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));ge.setIndex(indices);ge.computeVertexNormals();mesh(g,ge,mat(tone,{side:THREE.DoubleSide}));for(const zz of [z-d/2,z,z+d/2])for(let i=0;i<8;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;beam(g,[Math.cos(a)*r,y+Math.sin(a)*r+.03,zz],[Math.cos(b)*r,y+Math.sin(b)*r+.03,zz],.08,'cream',true);}
}
function dome(g,x,y,z,sx,sy,sz,tone){return mesh(g,new THREE.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI/2),tone,x,y,z,sx,sy,sz);}
function portico(g,w,z,y=4){canopy(g,w,z,y,0,'stone');for(let i=0;i<4;i++)cyl(g,.19,.24,y-.4,-w/2+.4+i*(w-.8)/3,(y+.4)/2,z+.4,'cream',10);roof(g,w,1.8,y+.2,1.6,0,z,'cream');}
function keepers(g,w,d,h){wall(g,w,d,h,0,.36,0,'cream');windows(g,w,d,h,0,.36,0,Math.max(1,Math.floor(h/2.8)));entry(g,d/2+.08);}
function houses(g,c){const {w,d,h,i}=c,body=h-2.6;
 if(i===0){wall(g,w,d,1.8,0,.36,0,'wood');roof(g,w,d,2.16,h-2.2,0,0,'slate');const sh=new THREE.Shape();sh.moveTo(-w/2+.45,0);sh.lineTo(w/2-.45,0);sh.lineTo(0,h-2.65);sh.closePath();mesh(g,new THREE.ShapeGeometry(sh),'darkglass',0,2.2,d/2+.28);beam(g,[0,2.2,d/2+.3],[0,h-.45,d/2+.3],.1,'cream',true);entry(g,d/2+.31);box(g,w+.6,.2,2,0,.38,d/2+.7,'wood');rail(g,w+.3,1.8,.48,0,d/2+.7);}
 if(i===1||i===6){const wingW=w*.31;for(const side of [-1,1]){const hh=i===6&&side>0?body+1.2:body;wall(g,wingW,d,hh,side*(w-wingW)/2,.36,0,side<0?'cream':'lightwood');roof(g,wingW,d,.36+hh,1.5,side*(w-wingW)/2);windows(g,wingW,d,hh,side*(w-wingW)/2,.36,0,1);}if(i===1){wall(g,w*.42,2.4,body,0,.36,-d/2+1.2,'cream');roof(g,w*.42,2.4,.36+body,1.5,0,-d/2+1.2);}else canopy(g,w*.4,0,body+.5);for(const x of [-1,1])garden(g,x,.36,1.8);if(i===1)entry(g,-d/2+2.45);else entry(g,d/2+.1,1.1,-w*.345);}
 if(i===2){wall(g,w*.58,d,body, -w*.21,.36,0,'stone');roof(g,w*.58,d,.36+body,1.7,-w*.21);glassBlock(g,w*.44,d*.75,body+1.5,w*.28,.36,.7,2,'cream');cap(g,w*.48,d*.78,body+2,w*.28,.7);entry(g,d/2+.09,1.2,-1.2);}
 if(i===3){for(const x of [-w*.4,w*.4])for(const z of [-d*.4,0,d*.4])box(g,.22,2.4,.22,x,1.2,z,'wood');wall(g,w,d,body-1.2,0,2.4,0,'lightwood');windows(g,w,d,body-1.2,0,2.4,0,1);roof(g,w,d,body+1.2,1.5);box(g,w+.8,.2,2,0,2.35,d/2+.55,'wood');rail(g,w+.6,1.8,2.45,0,d/2+.55);door(g,0,d/2+.1,2.45,1.1,2.1,'darkwood');for(let step=0;step<8;step++)box(g,1.4,.15,.4,0,.15+step*.28,d/2+2-step*.19,'wood');}
 if(i===4){for(const side of [-1,1]){const x=side*w/4;wall(g,w/2-.05,d,body,x,.36,0,side<0?'cream':'stone');roof(g,w/2,d,.36+body,2.1,x);windows(g,w/2,d,body,x,.36,0,2);entry(g,d/2+.09,1,x);canopy(g,w/2-.5,d/2+.6,2.9,x);} }
 if(i===5){keepers(g,w,d,body);roof(g,w,d,.36+body,1.8);canopy(g,w,d/2+.8,2.8);chimney(g,-w*.35,body+.6,-d*.2,2);for(let x=-w/2+.4;x<w/2;x+=.45)box(g,.035,body,.05,x,.36+body/2,d/2+.02,'wood');}
 if(i===7){cyl(g,w*.43,w*.43,body,0,.36+body/2,0,'cream',16);ell(g,0,body+.4,0,w*.48,2.15,w*.48,'terracotta');for(let j=0;j<8;j++){const a=j*Math.PI/4,sub=new THREE.Group();sub.position.set(Math.sin(a)*w*.43,0,Math.cos(a)*w*.43);sub.rotation.y=a;windowFront(sub,0,2,0,1.1,1.4);g.add(sub);}entry(g,w*.43+.1);canopy(g,3,w*.43+.65,2.9);}
 if(i===8){keepers(g,w,d,body);cap(g,w+.4,d+.4,body+.5);glassBlock(g,w*.55,d*.6,2.5,-.8,body+.58,-.65,1,'wood');roof(g,w*.55,d*.6,body+3.08,1.1,-.8,-.65,'glass');for(const x of [-w*.35,w*.35])garden(g,x,body+.62,d*.3);}
 if(i===9){keepers(g,w,d,body);roof(g,w,d,body+.36,2.1);cyl(g,1.5,1.5,body+1.1,w*.35,.36+(body+1.1)/2,d*.3,'stone',8);cone(g,1.8,1.8,w*.35,body+2.35,d*.3,'roof',8);for(const x of [-2,1]){wall(g,1.5,1.8,1.4,x,body+.65,.8,'cream');roof(g,1.5,1.8,body+2.05,.8,x,.8);}canopy(g,3,d/2+.6,2.9,-w*.25);}
}
function shops(g,c){const {w,d,h,i}=c,body=h-2.1;
 if(i===0){wall(g,w-3,d,body,0,.36,0,'cream');for(const x of [-(w-3)/2,(w-3)/2])cyl(g,d/2,d/2,body,x,.36+body/2,0,'cream',12);cap(g,w+.2,d+.2,body+.48,0,0,'terracotta');}
 else if(i===8){for(const x of [-w*.34,w*.34]){wall(g,w*.3,d,body,x,.36,0,'cream');roof(g,w*.3,d,body+.36,1.5,x);}wall(g,w*.4,d*.3,body,0,.36,-d*.35,'lightwood');}
 else{wall(g,w,d,body,0,.36,0,i===3||i===9?'stone':'cream');if(i===2||i===5||i===7)roof(g,w,d,body+.36,2);else cap(g,w,d,body+.5,0,0,i===9?'terracotta':'cream');}
 for(const x of i===8?[-w*.34,w*.34]:[-w*.29,w*.29])windowFront(g,x,1.65,d/2+.05,w*(i===8?.22:.29),1.8);entry(g,i===8?-d*.2+.09:d/2+.09,1.1);if(i!==8)awning(g,w-.4,d/2+.6,2.9,0,i%2?'terracotta':'leafDark');if(body>4)for(const x of [-w*.28,0,w*.28])windowFront(g,x,4.9,d/2+.05,1.25,1.5);
 if(i===0){for(const x of [-w*.32,w*.32]){cyl(g,.5,.5,.1,x,.95,d/2+1.3,'wood',12);cyl(g,.06,.08,.8,x,.5,d/2+1.3,'iron',8);}}
 if(i===1){box(g,1.3,.35,.2,0,body-.1,d/2+.18,'leafDark');box(g,.35,1.3,.2,0,body-.1,d/2+.18,'leafDark');}
 if(i===2){ell(g,0,body-.25,d/2+.18,.5,.65,.15,'wood');box(g,.16,1.4,.12,0,body+.55,d/2+.18,'darkwood');}
 if(i===3){for(const x of [-.55,.55]){const wheel=mesh(g,new THREE.TorusGeometry(.45,.08,6,16),'iron',x,body-.2,d/2+.2);wheel.rotation.y=.05;}box(g,2.2,.15,1,-w*.3,1.1,d/2+1.2,'wood');}
 if(i===4){ell(g,0,body-.2,d/2+.2,.44,.4,.12,'wood');for(const x of [-.6,-.2,.2,.6])petal(g,x,body+.32,d/2+.2,.17,.23,.1,'wood');canopy(g,2.4,d/2+.7,3,w/2+.9);}
 if(i===5){cyl(g,.65,.4,.4,0,body+.15,d/2+.1,'terracotta',16);for(const x of [-.3,.3])box(g,.06,1,.06,x,body+.8,d/2+.1,'wood',0,0,x*.7);for(const x of [-w*.36,w*.36]){cyl(g,.22,.22,.55,x,2.6,d/2+.9,'yellow',10);}}
 if(i===6){glassBlock(g,w*.6,d*.8,.9,0,body+.5,0,1);roof(g,w*.65,d*.85,body+1.4,.8);for(const x of [-w*.3,w*.3]){box(g,2,.7,1.1,x,.75,d/2+1,'cream');box(g,1.8,.05,1,x,1.12,d/2+1,'glass');}}
 if(i===7){box(g,3.2,2,.8,0,4.9,d/2+.1,'cream');for(const x of [-.85,0,.85])windowFront(g,x,4.9,d/2+.55,.65,1.45);for(let j=0;j<5;j++)cyl(g,.13,.13,1.2,-1+j*.5,1.1,d/2+1.1,tones[j],8);}
 if(i===8){for(const x of [-1.3,0,1.3])for(const z of [1,2.7]){cyl(g,.3,.2,.9,x,.81,z,'terracotta',12);cyl(g,.32,.32,.08,x,1.29,z,'sand',12);}barrel(g,w*.38,2,body+.3,-d*.35);}
 if(i===9){for(let j=0;j<3;j++)wall(g,w-2-j*1.6,.45,.5,0,body+.45+j*.45,d/2-.1,'terracotta');disk(g,0,body-.1,d/2+.23,.65,'iron');for(let j=0;j<8;j++){const a=j*Math.PI/4;box(g,.23,.23,.15,Math.sin(a)*.73,body-.1+Math.cos(a)*.73,d/2+.23,'iron',0,0,-a);}for(const x of [-w*.38,w*.38])for(let j=0;j<3;j++)box(g,1.2,.13,.7,x,.6+j*.4,d/2+1,'wood');}
}
function towers(g,c){const {w,d,h,i}=c;if(i!==5&&i!==7)wall(g,w,d,2.4,0,.36,0,'stone');
 if(i===0){glassBlock(g,w,d*.65,h,0,.36,-d*.15,10);wall(g,2,d*.8,h+1,w*.38,.36,-d*.1,'stone');for(let j=0;j<10;j++)box(g,w+1,.12,1.25,0,2+j*h/10,d*.3,'cream');for(const x of [-w*.35,0,w*.35])garden(g,x,h+.55,-d*.1);}
 if(i===1){glassBlock(g,w,d,h,0,.36,0,9);for(const z of [-d/2-.1,d/2+.1])for(let k=0;k<3;k++){const y=.6+k*h/3;beam(g,[-w/2,y,z],[w/2,y+h/3,z],.12,'cream',true);beam(g,[w/2,y,z],[-w/2,y+h/3,z],.12,'cream',true);}cap(g,w+.4,d+.4,h+.6);}
 if(i===2){const tier=h/5;for(let j=0;j<5;j++){const ww=w-j*1.8,dd=d-j*1.6,y=.36+j*tier;glassBlock(g,ww,dd,tier-.2,0,y,0,2,'stone');cap(g,ww+.5,dd+.5,y+tier);for(const x of [-ww*.35,ww*.35])garden(g,x,y+tier+.1,dd*.32);}}
 if(i===3){for(const [x,z,scale]of [[-w*.3,0,1],[w*.3,0,.82],[0,-d*.3,.65]])glassBlock(g,w*.28,d*.5,h*scale,x,.36,z,Math.round(8*scale));glassBlock(g,w*.35,2,2,0,h*.62,d*.12,1);wall(g,w,d*.4,2.5,0,.36,d*.3,'stone');}
 if(i===4){const sub=new THREE.Group();sub.scale.set(1,.95,.8);cyl(sub,w*.41,w*.41,h,0,.36+h/2,0,'glass',20);for(let y=1;y<h;y+=2.5){cyl(sub,w*.47,w*.47,.15,0,y,0,'cream',20);for(let j=0;j<12;j++){const a=j*Math.PI/6;box(sub,.07,2.3,.07,Math.sin(a)*w*.43,y+1.1,Math.cos(a)*w*.43,'cream');}}g.add(sub);canopy(g,w*.7,d*.4+1,3.1);}
 if(i===5){for(const side of [-1,1])glassBlock(g,w*.34,d,h,side*w*.33,.36,0,10);glassBlock(g,w*.34,d*.8,5,0,h*.62,0,2,'stone');cap(g,w+.3,d+.3,h+.6);}
 if(i===6){const levels=7;for(let j=0;j<levels;j++){const y=.36+j*h/levels,x=j%2?.65:-.65;glassBlock(g,w-1.5,d-1.5,h/levels-.15,x,y,0,1,j%2?'wood':'cream');cap(g,w,d,y+h/levels,x,0,'wood');for(const z of [-d*.38,d*.38])garden(g,x+(j%2?-w*.3:w*.3),y+h/levels+.08,z);}}
 if(i===7){wall(g,w,d,2.4,0,.36,0,'stone');const sub=new THREE.Group();glassBlock(sub,w*.62,w*.62,h-2,0,2.9,0,10);cone(sub,w*.48,2.8,0,h+2,0,'cream',4);sub.rotation.y=Math.PI/4;g.add(sub);}
 if(i===8){cyl(g,w*.28,w*.28,h,0,.36+h/2,0,'glass',18);for(let j=0;j<12;j++){const a=j*Math.PI/3,y=1+j*h/12,sub=new THREE.Group();box(sub,w*.6,.17,3.4,0,y,w*.23,'cream');rail(sub,w*.6,3.2,y+.1,0,w*.23);sub.rotation.y=a;g.add(sub);}cone(g,w*.32,1.8,0,h+1.2,0,'roof',18);}
 if(i===9){glassBlock(g,w,d,h-3.5,0,.36,0,9,'stone');glassBlock(g,w*.63,d*.63,3.1,0,h-3,0,1,'wood');roof(g,w*.68,d*.68,h+.1,1.8,0,0,'glass');for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])cone(g,.35,2.4,x,h-.1,z,'cream',6);}
 entry(g,d/2+.12,1.5,i===5?w*.33:0);canopy(g,Math.min(6,w*.6),d/2+.6,3.1,i===5?w*.27:0);
}
function civic(g,c){const {w,d,h,i}=c,body=h-3;
 if(i===0||i===2||i===5){for(const side of [-1,1]){wall(g,w*.3,d*.75,body,side*w*.35,.36,-d*.1,'stone');windows(g,w*.3,d*.75,body,side*w*.35,.36,-d*.1,2);roof(g,w*.3,d*.75,body+.36,1.5,side*w*.35,-d*.1);}wall(g,w*.42,d,body+1.5,0,.36,0,'cream');portico(g,w*.43,d/2+.6,4.2);if(i===2){wall(g,3,3,h-1.5,0,1,-1,'stone');clock(g,0,h-1,1,.7);roof(g,3,3,h+.1,1.7,0,-1);}else if(i===5){cyl(g,1.6,1.6,1.4,0,h-.7,-1,'cream',12);ell(g,0,h+.1,-1,1.9,1.2,1.9,'terracotta');}else glassBlock(g,w*.35,d*.35,1.5,0,h-.6,-1,1);}
 if(i===1){keepers(g,w*.72,d,body+1);roof(g,w*.76,d,body+1.36,1.8);wall(g,w*.3,d*.7,body,w*.48,.36,-d*.1,'red');cap(g,w*.32,d*.72,body+.5,w*.48,-d*.1);clock(g,0,body+1.85,d/2+.3,.6);canopy(g,w*.5,d/2+.65,3.1);}
 if(i===3){glassBlock(g,w,d,body,0,.36,0,1);wall(g,w*.4,d*.4,1.3,-w*.25,body+.5,-d*.2,'cream');canopy(g,w*.6,d/2+.65,3);box(g,1.2,.3,.12,w*.25,body-.25,d/2+.15,'leafDark');box(g,.3,1.2,.12,w*.25,body-.25,d/2+.15,'leafDark');for(const x of [-w*.4,w*.4])garden(g,x,.36,d*.4);}
 if(i===4){wall(g,w,d,1.2,0,.36,0,'cream');box(g,w-2,.09,d-2,0,1.61,0,'water');barrel(g,w*.72,d,2.2,0,'glass');for(const side of [-1,1])wall(g,w*.15,d,body,side*w*.42,.36,0,'cream');canopy(g,5,d/2+.5,3);}
 if(i===6){cyl(g,w*.44,w*.44,body,0,.36+body/2,-d*.1,'stone',20);glassBlock(g,w,d*.35,3.7,0,.36,d*.25,1,'cream');box(g,w+.4,.2,d*.4,0,4.2,d*.3,'roof',-.1);for(const x of [-w*.3,0,w*.3])entry(g,d*.43,1.5,x);}
 if(i===7){wall(g,w,d*.42,body,0,.36,-d*.22,'cream');windows(g,w,d*.42,body,0,.36,-d*.22,2);for(let j=0;j<5;j++){const x=-w*.4+j*w*.2;roof(g,w*.2,d*.7,body+.4,1.5,x,d*.12);for(const z of [-d*.15,d*.45])box(g,.16,body,.16,x-w*.08,.36+body/2,z,'iron');}box(g,w+1,.22,d*.4,0,.45,d*.35,'stone');}
 if(i===8){for(const [x,z,ww,dd]of [[-w*.32,0,w*.32,d],[w*.32,0,w*.32,d],[0,-d*.3,w*.4,d*.4]]){glassBlock(g,ww,dd,body,x,.36,z,1,'wood');cap(g,ww+.4,dd+.4,body+.6,x,z,'leafDark');}for(let j=0;j<5;j++)box(g,w*.42,.12,.14,0,3.1,d*.05+j*.6,'wood');for(const x of [-w*.2,w*.2])for(const z of [0,d*.35])box(g,.13,2.7,.13,x,1.7,z,'wood');garden(g,0,.36,1);}
 if(i===9){cyl(g,w*.4,w*.4,3.4,0,2.06,-.7,'stone',24);dome(g,0,3.75,-.7,w*.42,h*.55,w*.42,'roof');glassBlock(g,w*.68,d*.4,2.8,0,.36,d*.35,1);canopy(g,w*.5,d*.55,3);const orbit=mesh(g,new THREE.TorusGeometry(.75,.055,6,24),'yellow',0,3.9,d*.56);orbit.rotation.z=.4;ell(g,0,3.9,d*.56,.34,.34,.34,'glass');}
}
function industries(g,c){const {w,d,h,i}=c,body=Math.min(6,h-2);
 if(i===4){wall(g,w*.5,d*.85,body,-w*.23,.36,0,'stone');roof(g,w*.5,d*.85,body+.36,1.6,-w*.23);for(const z of [-d*.25,d*.25]){cyl(g,w*.19,w*.19,2.9,w*.29,1.8,z,'stone',16);cyl(g,w*.17,w*.17,.08,w*.29,3.29,z,'water',16);}for(const z of [-d*.25,d*.25])beam(g,[-1,2,z],[w*.28,2,z],.17,'iron');}
 else if(i===9){wall(g,w*.45,d*.85,body,-w*.25,.36,0,'cream');roof(g,w*.45,d*.85,body+.36,2,-w*.25);for(const x of [w*.12,w*.38])for(const z of [-d*.25,d*.2]){cyl(g,1.65,1.65,h-1,x,.36+(h-1)/2,z,'stone',16);cone(g,1.8,1.6,x,h+.16,z,'cream',16);for(let y=1;y<h-1;y+=1.1)cyl(g,1.68,1.68,.055,x,y,z,'iron',16);}box(g,w*.62,.55,.8,0,h*.65,0,'iron');}
 else{wall(g,w,d,body,0,.36,0,i===1||i===2||i===3?'terracotta':'stone');if([1,2,6].includes(i))for(let j=0;j<4;j++)roof(g,w/4,d,body+.36,1.55,-w*.375+j*w/4);else if(i===3||i===8)roof(g,w,d,body+.36,2.3);else cap(g,w,d,body+.52,0,0,'roof');}
 const bayCount=i===6?4:3;for(let j=0;j<(i===4||i===9?0:bayCount);j++){const x=-w*.32+j*(w*.64)/(bayCount-1);box(g,w/(bayCount+1)*.75,body*.6,.12,x,.4+body*.3,d/2+.06,i===5?['leafDark','yellow','glass'][j]:'darkglass');for(let k=0;k<6;k++)box(g,w/(bayCount+1)*.76,.045,.06,x,.7+k*body*.08,d/2+.14,'iron');}
 if(i===4||i===9)entry(g,d*.425+.08,1.3,-w*.24);
 if([0,6,8].includes(i)){canopy(g,w*.83,d/2+.85,3.2,0,'iron');wall(g,w*.25,d*.45,body+1.2,-w*.43,.36,-d*.24,'cream');windows(g,w*.25,d*.45,body+1.2,-w*.43,.36,-d*.24,2);}
 if([1,2,3].includes(i)){for(const x of i===2?[-w*.42,w*.42]:[w*.42]){cyl(g,.5,.75,h+1,x,.36+(h+1)/2,-d*.35,'terracotta',10);cyl(g,.7,.7,.22,x,h+1.4,-d*.35,'cream',10);}if(i===1)for(let j=0;j<8;j++)box(g,3,.22,.24,-w*.28,.55+(j%4)*.26,d/2+.9+Math.floor(j/4)*.35,'wood');}
 if(i===2||i===8){glassBlock(g,w*.55,d*.7,1,0,body+1.4,0,1);roof(g,w*.58,d*.74,body+2.4,.8);}
 if(i===5){for(const x of [-w*.35,w*.35])box(g,.2,body+1.8,.2,x,(body+1.8)/2,d*.2,'yellow');box(g,w*.75,.3,.4,0,body+1.8,d*.2,'yellow');}
 if(i===7){for(const x of [-w*.32,w*.32]){wall(g,2.7,2.8,2.5,x,.36,d/2+1.1,'iron');for(let j=0;j<6;j++)box(g,.11,2.3,3,x-1.1+j*.44,1.6,d/2+1.1,'stone');cyl(g,.18,.18,.9,x,3.3,d/2+1.1,'cream',8);}for(let j=0;j<5;j++)box(g,w*.65,.16,.45,0,1.1+j*.7,d/2+.12,'iron');}
 if(i===8)for(const x of [-w*.38,w*.38])for(let j=0;j<3;j++)box(g,1.2,.8,1.1,x,.76+j*.8,d/2+1.25,'sand');
}
function landmarks(g,c){const {w,d,h,i}=c;
 if(i===0){cyl(g,1.65,2.4,h-3,0,.36+(h-3)/2,0,'cream',16);for(let j=0;j<5;j++)cyl(g,2.4-(j+.5)*.15,2.4-j*.15,.45,0,1.4+j*3.1,0,'leafDark',16);cyl(g,2.4,2.4,.22,0,h-2.5,0,'stone',16);cyl(g,1.65,1.65,1.9,0,h-1.45,0,'glass',16);for(let j=0;j<8;j++){const a=j*Math.PI/4;box(g,.1,2,.1,Math.sin(a)*1.66,h-1.4,Math.cos(a)*1.66,'cream');}cone(g,2.15,1.7,0,h+.4,0,'roof',16);wall(g,5,4,2.5,-2.2,.36,2.4,'cream');roof(g,5,4,2.86,1.3,-2.2,2.4);entry(g,4.45,1,-2.2);}
 if(i===1||i===5){const tw=i===1?3.8:5;wall(g,tw,tw,h-4,0,.36,0,'stone');for(const x of [-tw/2+.2,tw/2-.2])for(const z of [-tw/2+.2,tw/2-.2])box(g,.3,3.2,.3,x,h-2,z,'cream');cap(g,tw+.5,tw+.5,h-.3);roof(g,tw+.6,tw+.6,h-.2,2.3);if(i===1){cyl(g,.45,.85,1.15,0,h-2,0,'yellow',12);ell(g,0,h-2.65,0,.14,.14,.14,'iron');}else for(let j=0;j<4;j++){const sub=new THREE.Group();clock(sub,0,h-5,tw/2+.1,.9);sub.rotation.y=j*Math.PI/2;g.add(sub);}entry(g,tw/2+.1,1.3);stairs(g,tw+1,tw/2+.5,3);}
 if(i===2){for(let j=0;j<3;j++){const ww=w-j*2.5,dd=d-j*2.1,y=3.1+j*3.3;for(const x of [-ww*.4,ww*.4])for(const z of [-dd*.4,dd*.4])box(g,.2,3,.2,x,y-1.5,z,'wood');roof(g,ww,dd,y,1.65,0,0,j%2?'terracotta':'leafDark');cap(g,ww+.8,dd+.8,y-.05,0,0,'roof');}box(g,w,.4,d,0,.45,0,'stone');stairs(g,5,d/2+.5,3);}
 if(i===3){for(const side of [-1,1]){wall(g,w*.25,d*.7,h-2,side*w*.37,.36,0,'stone');roof(g,w*.27,d*.75,h-1.64,1.8,side*w*.37);}wall(g,w*.5,d*.55,3.5,0,h-5,0,'cream');for(const x of [-2,0,2])windowFront(g,x,h-3.3,d*.28+.1,1,1.4);beam(g,[-w*.25,h-5.2,d*.29],[0,h-6.5,d*.29],.3,'cream',true);beam(g,[0,h-6.5,d*.29],[w*.25,h-5.2,d*.29],.3,'cream',true);}
 if(i===4){cyl(g,w*.35,w*.35,4.4,0,2.56,0,'cream',24);dome(g,0,4.7,0,w*.37,h*.37,w*.37,'roof');box(g,.6,h*.5,w*.8,0,6.2,0,'cream');wall(g,w*.6,d*.35,2.6,0,.36,d*.36,'stone');roof(g,w*.62,d*.36,2.96,1.1,0,d*.36);entry(g,d*.54+.1,1.4);}
 if(i===6){for(let j=0;j<5;j++){const r=w*.22+j*.65;for(let k=0;k<12;k++){const a=Math.PI*.05+k*Math.PI*.9/11;box(g,1.35,.45,1.1,Math.cos(a)*r,.6+j*.43,-1+Math.sin(a)*r,'stone',0,-a);}}box(g,w*.52,.6,3.2,0,.66,-d*.25,'wood');for(const x of [-w*.25,w*.25])box(g,.2,4,.2,x,2.4,-d*.3,'wood');box(g,w*.6,.2,4.1,0,4.5,-d*.3,'roof',.1);}
 if(i===7){cyl(g,w*.43,w*.43,1,0,.86,0,'stone',24);dome(g,0,1.4,0,w*.44,h*.72,w*.44,mat('glass',{transparent:true,opacity:.24,roughness:.22,depthWrite:false})).castShadow=false;
  box(g,1.3,.05,w*.78,0,.395,0,'sand');box(g,w*.7,.05,1.1,0,.395,0,'sand');
  for(const [x,z,tall]of [[-2.6,-.9,3.6],[2.4,-1.4,4.4],[0,2.3,3]]){cyl(g,.16,.25,tall,x,.4+tall/2,z,'wood',9);for(const [dx,dy,dz,r,tone]of [[0,.15,0,1.2,'leaf'],[-.65,-.25,.2,.85,'leafDark'],[.6,-.1,-.3,.95,'leafLight']])ell(g,x+dx,.4+tall+dy,z+dz,r,r*1.12,r,tone);}
  for(const x of [-3.5,3.5])for(const z of [-3,2.8]){planter(g,x,.4,z,1.65,1.3);for(let k=0;k<3;k++)petal(g,x-.45+k*.45,1.4,z,.16,.12,.16,k%2?'flower':'yellow');}
 for(let j=0;j<12;j++){const a=j*Math.PI/6;for(let k=0;k<7;k++){const p=k*Math.PI/14,q=(k+1)*Math.PI/14;beam(g,[Math.cos(a)*w*.44*Math.cos(p),1.4+h*.72*Math.sin(p),Math.sin(a)*w*.44*Math.cos(p)],[Math.cos(a)*w*.44*Math.cos(q),1.4+h*.72*Math.sin(q),Math.sin(a)*w*.44*Math.cos(q)],.065,'cream',true);}}canopy(g,4,w*.43+.6,2.8);entry(g,w*.43+.1,1.4);}
 if(i===8){const legHeight=h-5;for(const x of [-3.2,3.2])for(const z of [-3.2,3.2])box(g,.3,legHeight,.3,x,legHeight/2,z,'wood');for(const z of [-3.2,3.2])for(let j=0;j<3;j++){const y=.15+j*(legHeight-.15)/3;beam(g,[-3.2,y,z],[3.2,y+legHeight/3,z],.12,'wood',true);beam(g,[3.2,y,z],[-3.2,y+legHeight/3,z],.12,'wood',true);}cap(g,9,9,legHeight,0,0,'wood');rail(g,8.8,8.8,legHeight+.1);glassBlock(g,6.2,6.2,3.2,0,legHeight+.1,0,1,'wood');roof(g,6.3,6.3,legHeight+3.3,2);}
 if(i===9){for(const x of [-w*.3,w*.3])wall(g,2.2,2.8,h-3,x,.36,0,'stone');wall(g,w*.75,3,1.7,0,h-3,0,'cream');disk(g,0,h-.2,0,2,'yellow');for(let j=0;j<12;j++){const a=j*Math.PI/6;beam(g,[Math.sin(a)*2.1,h-.2+Math.cos(a)*2.1,0],[Math.sin(a)*2.65,h-.2+Math.cos(a)*2.65,0],.12,'yellow',true);}for(let j=0;j<4;j++)box(g,w-j*.7,.17,d-j*.8,0,.1+j*.16,0,'stone');}
}
export function createExpandedBuilding(id){const c=lookup.get(id);if(!c)return null;const g=new THREE.Group();g.name=id;foundation(g,c.w+.6,c.d+.6);if(c.group==='Homes')houses(g,c);if(c.group==='Shops')shops(g,c);if(c.group==='Towers')towers(g,c);if(c.group==='Civic')civic(g,c);if(c.group==='Industry')industries(g,c);if(c.group==='Landmarks')landmarks(g,c);return g;}
