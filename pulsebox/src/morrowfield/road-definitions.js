// Pure catalog/layout data: safe to share with the terrain and save engines.
export const ROAD_STYLES=[
 {id:'boulevard',name:'Boulevard',surface:0x788682,edge:0xc9c6b4,width:4,pattern:'lane',detail:3},
 {id:'cobble',name:'Old town cobbles',surface:0xa3a99b,edge:0xc5bda4,width:3.7,pattern:'cobble',detail:6},
 {id:'sandstone',name:'Desert sandstone',surface:0xc7aa75,edge:0xe3cd9e,width:3.5,pattern:'tiles',detail:4},
 {id:'boardwalk',name:'Timber boardwalk',surface:0x9a7756,edge:0x6d5844,width:3.8,pattern:'planks',detail:12},
 {id:'brick',name:'Brick promenade',surface:0xb88064,edge:0xe0c8a4,width:3.6,pattern:'brick',detail:8},
 {id:'mosaic',name:'Garden mosaic',surface:0x809a8a,edge:0xd7d5b6,width:3.4,pattern:'mosaic',detail:5},
 {id:'cycle',name:'Cycle avenue',surface:0x71978a,edge:0xd4caaa,width:4.2,pattern:'cycle',detail:2},
 {id:'tram',name:'Tram street',surface:0x9e9c8a,edge:0xc9c6b8,width:4.1,pattern:'tram',detail:7},
 {id:'marina',name:'Marina promenade',surface:0xc2b797,edge:0xe1dcc5,width:3.9,pattern:'waves',detail:9},
 {id:'alpine',name:'Alpine flagstones',surface:0x929a9b,edge:0xc9d0c8,width:3.3,pattern:'slabs',detail:3},
];
const layouts=[['straight','straight',['north','south']],['corner','corner',['north','east']],['junction','T junction',['west','east','south']],['crossroads','crossroads',['north','south','west','east']],['walkway','footpath',[]],['square','square',[]]];
export const ROAD_EXPANSION=ROAD_STYLES.flatMap(style=>layouts.map(([layout,label,connections])=>({
 id:`route-${style.id}-${layout}`,name:`${style.name} ${label}`,category:'Roads',kind:'road',collection:'world-expansion',
 description:layout==='walkway'?`A four-meter ${style.name.toLowerCase()} walking path; hold and drag to connect a row.`:layout==='square'?`A patterned ${style.name.toLowerCase()} pedestrian square with a distinct central paving motif.`:`A six-meter ${style.name.toLowerCase()} ${label}, with matching edges and detailed paving.`,
 tags:`road route path transport ${style.id} ${style.pattern} ${layout} ${label}`,style:style.id,layout,connections,
 radius:layout==='walkway'?2.6:4.25,height:.28,footprint:{halfX:layout==='walkway'?1.5:3,halfZ:layout==='walkway'?2:3},
 ...(layout==='straight'||layout==='walkway'?{lineKind:'road',segmentLength:layout==='walkway'?4:6}:{}),
})));
