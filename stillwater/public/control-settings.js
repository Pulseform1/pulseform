/** A one-time requested increase also applies to existing saved mouse profiles. */
export function increasedMouseSensitivity(value){
  const previous=Number.isFinite(value)?value:1;
  return Math.round(Math.min(4,Math.max(.3,previous*1.6))*100)/100;
}
