export const WEAPONS=[{name:'Kestrel M40',type:'BOLT-ACTION RIFLE',clip:8,damage:72,interval:1.12,cycle:1.08,action:'bolt',reload:2.65,recoil:.036,spread:.0013,auto:false,range:150,color:0x68513a},{name:'Hartmann S12',type:'SEMI-AUTOMATIC',action:'semi',clip:12,damage:38,interval:.27,reload:2.3,recoil:.022,spread:.0023,auto:false,range:120,color:0x70573c},{name:'Wren 28',type:'SUBMACHINE GUN',action:'automatic',clip:28,damage:23,interval:.095,reload:2.05,recoil:.015,spread:.007,auto:true,range:80,color:0x515747},{name:'Morrow P10',type:'SIDEARM',action:'slide',clip:10,damage:32,interval:.24,reload:1.5,recoil:.024,spread:.004,auto:false,range:65,color:0x554a3e}];
WEAPONS.push(
{name:'Brenwick L36',type:'LIGHT MACHINE GUN',action:'automatic',clip:36,damage:24,interval:.12,reload:3.2,recoil:.026,spread:.006,auto:true,range:100,color:0x555e48,price:900},
{name:'Harrier C18',type:'COMPACT CARBINE',action:'semi',clip:18,damage:34,interval:.19,reload:1.85,recoil:.018,spread:.0022,auto:false,range:110,color:0x8b6740,price:550},
{name:'Alder D6',type:'HEAVY REVOLVER',action:'revolver',clip:6,damage:58,interval:.5,reload:2.8,recoil:.042,spread:.003,auto:false,range:70,color:0x5c524b,price:350}
);
export function magazineSize(player,index){const level=Math.max(0,Math.min(2,Math.floor(Number(player.magUpgrades?.[index])||0)));return Math.round(WEAPONS[index].clip*(1+level*.25))}

// Issued only in Dead City; these do not enter the campaign armory.
WEAPONS.push(
{name:'Sentinel S7',type:'SCOPED SNIPER',survivalOnly:true,clip:7,damage:145,interval:1.1,cycle:1.05,action:'bolt',reload:2.6,recoil:.04,spread:.0004,auto:false,range:180,color:0x454d43,scope:6},
{name:'AK-47',type:'AUTOMATIC ASSAULT RIFLE',survivalOnly:true,clip:30,damage:36,interval:.1,action:'automatic',reload:2.4,recoil:.022,spread:.003,auto:true,range:130,color:0x765536},
{name:'Survival knife',type:'MELEE',survivalOnly:true,clip:1,damage:125,interval:.65,action:'knife',reload:0,recoil:0,spread:0,auto:false,range:1.85,color:0x8b9588}
);
export const SURVIVAL_LOADOUT=[7,8,3,9];
