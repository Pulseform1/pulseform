// Shared scare pacing. The next event is never an immediate repeat.
export function planHaunt(previous,age,random=Math.random){
  const pool=age<30?['footsteps','whisper','blackout','impact']:['blackout','footsteps','whisper','apparition','impact','ambush','falsealarm','stalker'];
  const choices=pool.filter(kind=>kind!==previous);
  return {kind:choices[Math.min(choices.length-1,Math.floor(random()*choices.length))],delay:20+random()*20};
}
