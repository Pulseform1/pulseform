export function movementInput(keys){
  const looking=!!keys.Space;
  const forward=Number(!!(keys.KeyW||(!looking&&keys.ArrowUp)))-Number(!!(keys.KeyS||(!looking&&keys.ArrowDown)));
  const side=Number(!!(keys.KeyD||(!looking&&keys.ArrowRight)))-Number(!!(keys.KeyA||(!looking&&keys.ArrowLeft)));
  const length=Math.hypot(forward,side)||1;
  return {forward:forward/length,side:side/length,turn:Number(!!(keys.KeyL||(looking&&keys.ArrowRight)))-Number(!!(keys.KeyJ||(looking&&keys.ArrowLeft))),look:Number(!!(keys.KeyI||(looking&&keys.ArrowUp)))-Number(!!(keys.KeyK||(looking&&keys.ArrowDown)))};
}
