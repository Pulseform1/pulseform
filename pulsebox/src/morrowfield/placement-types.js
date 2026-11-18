import {ROAD_EXPANSION} from './road-definitions.js';
export function isFenceType(type){return type==='fence'||type==='gate'||/^zoo-(fence|gate)-[a-z0-9-]+$/.test(type);}
export function segmentLength(type){if(isFenceType(type))return type==='gate'||type.startsWith('zoo-gate-')?3:4;return type==='stone-path'?3.84:ROAD_EXPANSION.find(item=>item.id===type)?.segmentLength||6;}
export const ROAD_LINE_IDS=ROAD_EXPANSION.filter(item=>item.lineKind==='road').map(item=>item.id);
