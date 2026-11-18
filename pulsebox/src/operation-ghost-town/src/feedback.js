export class DamageFeedback{
constructor(){this.age=10;this.amount=0;this.source=null;this.sequence=0}
trigger(amount,attacker){this.amount=Math.max(1,Math.min(100,Number(amount)||15));this.age=0;this.source=attacker?{x:attacker.x,z:attacker.z}:null;this.sequence++}
update(dt,player,reducedMotion=false){this.age+=dt;const strength=Math.min(1,.45+this.amount/80),flash=Math.exp(-this.age*5.2)*strength,lowHealth=player.alive&&player.health<=30;let direction=null;if(this.source)direction=(Math.atan2(this.source.x-player.x,-(this.source.z-player.z))+player.yaw)*180/Math.PI;return {flash:this.age>1.4?0:flash,showText:this.age<1.15,amount:this.amount,direction:this.age<1.1?direction:null,lowHealth,roll:reducedMotion?0:Math.sin(this.age*40)*Math.exp(-this.age*13)*strength*.013}}
}
