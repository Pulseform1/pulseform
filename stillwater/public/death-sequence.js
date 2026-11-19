export function attackVariant(player,monsterId='dredge'){let hash=0;for(const c of String(player?.killerMonsterUid||monsterId))hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return (hash+(player?.lifeId||0))%3;}

/** A presentation-only response to one authoritative local alive→dead transition. */
export class DeathSequence {
  constructor(){this.reset(null);}
  reset(player){this.playerId=player?.id??null;this.wasAlive=!!player?.alive;this.lifeId=player?.lifeId??0;this.current=null;}
  observe(player,now,{monsterId='dredge',reduced=false}={}){
    if(!player)return false;
    if(player.id!==this.playerId){this.reset(player);return false;}
    const lifeId=player.lifeId??0;if(lifeId<this.lifeId)return false;if(lifeId!==this.lifeId){this.reset(player);return false;}
    const died=this.wasAlive&&!player.alive;this.wasAlive=!!player.alive;
    if(!died)return false;
    this.current={monsterId,variant:attackVariant(player,monsterId),lifeId,reduced,start:now,duration:reduced?440:1240};return true;
  }
  frame(now){if(!this.current)return null;if(now-this.current.start>=this.current.duration){this.current=null;return null;}return this.current;}
  skip(){this.current=null;}
}
