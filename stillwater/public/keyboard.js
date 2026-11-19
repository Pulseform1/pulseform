/** Keyboard camera uses elapsed time and a short ramp, with immediate release. */
export class KeyboardLook {
  constructor(){this.reset();}
  reset(){this.horizontal=0;this.vertical=0;this.heldX=0;this.heldY=0;}
  update(keys,dt,speed=1){
    dt=Math.min(.05,Math.max(0,dt));speed=Math.max(.35,Math.min(2,Number(speed)||1));
    const x=(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0),y=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0);
    this.heldX=x&&x===this.horizontal?Math.min(.28,this.heldX+dt):0;
    this.heldY=y&&y===this.vertical?Math.min(.28,this.heldY+dt):0;
    this.horizontal=x;this.vertical=y;
    return {yaw:x*(.85+1.55*this.heldX/.28)*speed*dt,pitch:y*(.65+1.1*this.heldY/.28)*speed*dt};
  }
}
export function focusIdentity(element){
  if(!element)return null;
  if(element.id)return {kind:'id',value:element.id};
  if(element.dataset?.monster)return {kind:'monster',value:element.dataset.monster};
  if(element.dataset?.action)return {kind:'action',value:element.dataset.action};
  return null;
}
export function matchingFocus(elements,identity){
  if(!identity)return null;
  return elements.find(e=>identity.kind==='id'?e.id===identity.value:e.dataset?.[identity.kind]===identity.value)||null;
}
export function nextFocus(elements,current,direction){
  if(!elements.length)return null;const i=elements.indexOf(current);
  return elements[i<0?(direction<0?elements.length-1:0):(i+direction+elements.length)%elements.length];
}
