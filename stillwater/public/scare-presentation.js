// Immediate native-rig attack: a short glimpse of the actual source creature,
// then a 150ms physical snap. Three approach paths share one audible contact.
// The captured poolroom stays visible through the whole sequence.
export const LIVE_SCARE_DURATION=1.12;
export const LIVE_SCARE_IMPACT=.22;
export const LIVE_ATTACK_KEYS=Object.freeze([
  {at:0,energy:.08,reveal:.22,focus:.18,tightness:1.19,fov:52,roll:0,exposure:.84},
  {at:.07,energy:.18,reveal:.43,focus:.28,tightness:1.10,fov:52,roll:0,exposure:.88},
  {at:.22,energy:1,reveal:1,focus:1,tightness:.82,fov:52,roll:0,exposure:.99},
  {at:.32,energy:1,reveal:1,focus:1,tightness:.82,fov:52,roll:0,exposure:.97},
  {at:.56,energy:.38,reveal:.73,focus:.43,tightness:1.08,fov:52,roll:0,exposure:.91},
  {at:.78,energy:.18,reveal:.48,focus:.20,tightness:1.19,fov:52,roll:0,exposure:.86},
  {at:1.12,energy:.05,reveal:.22,focus:.12,tightness:1.25,fov:52,roll:0,exposure:.84}
].map(Object.freeze));
