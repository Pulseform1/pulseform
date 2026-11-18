export function createStamina(){return {stamina:100,sprintWanted:false,exhausted:false,recoveryDelay:0}}
export function canSprint(state){return state.sprintWanted&&!state.exhausted&&state.stamina>0&&!state.crouch&&!state.hidden}
export function toggleSprint(state){if(state.exhausted)return false;state.sprintWanted=!state.sprintWanted;return state.sprintWanted}
export function stepStamina(state,dt,moving){
 if(canSprint(state)&&moving){state.stamina=Math.max(0,state.stamina-18*dt);state.recoveryDelay=1;if(state.stamina===0){state.exhausted=true;state.sprintWanted=false}}
 else{const delay=state.recoveryDelay||0;state.recoveryDelay=Math.max(0,delay-dt);const recoveredTime=Math.max(0,dt-delay);state.stamina=Math.min(100,state.stamina+12*recoveredTime);if(state.exhausted&&state.stamina>=20)state.exhausted=false}
 return state;
}
