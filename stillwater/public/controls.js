/** Pointer lock is an enhancement, never a prerequisite for playing in a webview. */
export class BrowserControls {
  constructor({canvas,document:doc=globalThis.document,onChange=()=>{},onPause=()=>{},onLook=()=>{},onHint=()=>{},onDiagnostic=()=>{},fallbackDelay=600}){
    this.canvas=canvas;this.doc=doc;this.onChange=onChange;this.onPause=onPause;this.onLook=onLook;this.onHint=onHint;this.fallbackDelay=fallbackDelay;this.onDiagnostic=onDiagnostic;this.requestedAt=0;this.releaseGuardUntil=0;this.diagnosticAttempt=0;this.lastBrowserLock=false;
    this.active=false;this.mode='inactive';this.pending=false;this.dragging=false;this.hoverX=null;this.hoverY=null;this.generation=0;this.timer=null;this.captureRequested=false;this.edgeX=0;this.edgeY=0;this.bounds=null;
    this.lastAttempt=null;
    this.diagnosis={state:'idle',reason:'',errorName:'',errorMessage:'',attempt:0,userActivation:null};
    this.listeners=[];
    const listen=(target,type,fn)=>{target.addEventListener(type,fn);this.listeners.push(()=>target.removeEventListener(type,fn));};
    listen(doc,'pointerlockchange',()=>{
      if(doc.pointerLockElement===canvas){
        this.lastBrowserLock=true;
        if(!this.pending&&this.mode!=='locked'&&!(this.captureRequested&&this.active)){this.report('late-grant','app-cancelled');doc.exitPointerLock?.();return;}
        this.report('grant');this.activate('locked');
      }else{if(this.lastBrowserLock){this.lastBrowserLock=false;this.report('released','observed-release');}if(this.mode==='locked'&&this.active){this.releaseGuardUntil=Date.now()+300;this.suspend('released');this.onPause();}}
    });
    listen(doc,'pointerlockerror',()=>{if(this.captureRequested&&!this.captured)this.fallback('rejected-event');});
    listen(doc,'mousemove',e=>{if(this.active&&this.mode==='locked'&&doc.pointerLockElement===canvas)this.onLook(e.movementX||0,e.movementY||0);});
    listen(canvas,'pointerdown',e=>{
      if(!this.active||this.mode!=='drag'||(e.button!==0&&e.button!==2))return;
      this.dragging=true;this.lastX=e.clientX;this.lastY=e.clientY;canvas.focus?.({preventScroll:true});
      try{canvas.setPointerCapture?.(e.pointerId);}catch{}
      e.preventDefault?.();
    });
    listen(canvas,'pointermove',e=>{
      if(this.active&&this.mode==='hover'){
        if(this.hoverX!==null)this.onLook(e.clientX-this.hoverX,e.clientY-this.hoverY);this.hoverX=e.clientX;this.hoverY=e.clientY;
        const b=this.bounds||(this.bounds=canvas.getBoundingClientRect?.());
        if(b){const edge=(value,size)=>value<32?-(1-Math.max(0,value)/32):value>size-32?1-Math.max(0,size-value)/32:0;this.edgeX=edge(e.clientX-b.left,b.width);this.edgeY=edge(e.clientY-b.top,b.height);}
        return;
      }
      if(!this.active||this.mode!=='drag'||!this.dragging)return;
      const dx=e.clientX-this.lastX,dy=e.clientY-this.lastY;this.lastX=e.clientX;this.lastY=e.clientY;this.onLook(dx,dy);e.preventDefault?.();
    });
    listen(canvas,'pointerleave',()=>{this.hoverX=this.hoverY=null;this.edgeX=this.edgeY=0;});
    if(doc.defaultView)listen(doc.defaultView,'resize',()=>{this.bounds=null;this.edgeX=this.edgeY=0;});
    const stopDrag=()=>{this.dragging=false;};
    listen(canvas,'pointerup',stopDrag);listen(canvas,'pointercancel',stopDrag);listen(canvas,'lostpointercapture',stopDrag);
    listen(doc,'pointerup',stopDrag);listen(doc,'pointercancel',stopDrag);
    listen(canvas,'contextmenu',e=>{if(this.active&&this.mode==='drag')e.preventDefault?.();});
  }
  enter(preference='capture'){
    const generation=++this.generation;clearTimeout(this.timer);this.pending=true;this.captureRequested=false;this.canvas.focus?.({preventScroll:true});
    if(preference==='keyboard'){this.diagnosis.state='keyboard';this.diagnosis.reason='chosen';this.activate('keyboard');return;}
    if(preference===true||preference==='drag'){this.diagnosis.state='fallback';this.diagnosis.reason='chosen';this.activate('drag');return;}
    if(preference==='hover'){this.diagnosis.state='fallback';this.diagnosis.reason='chosen';this.activate('hover');return;}
    if(this.doc.pointerLockElement===this.canvas){this.activate('locked');return;}
    const activation=this.doc.defaultView?.navigator?.userActivation||globalThis.navigator?.userActivation;
    this.diagnosis={state:'pending',reason:'',errorName:'',errorMessage:'',attempt:++this.diagnosticAttempt,userActivation:activation?{isActive:!!activation.isActive,hasBeenActive:!!activation.hasBeenActive}:null};this.requestedAt=Date.now();this.releaseGuardUntil=0;this.report('request');
    if(typeof this.canvas.requestPointerLock!=='function'){this.fallback('unsupported');return;}
    this.captureRequested=true;
    this.timer=setTimeout(()=>{if(this.pending&&this.generation===generation)this.fallback('timeout');},this.fallbackDelay);
    try{
      const result=this.canvas.requestPointerLock();
      result?.then?.(()=>{if(this.generation===generation&&this.doc.pointerLockElement!==this.canvas)this.report('resolved-unconfirmed');},error=>{if(this.captureRequested&&this.generation===generation&&!this.captured)this.fallback('rejected',error);});
      if(this.doc.pointerLockElement===this.canvas&&this.mode!=='locked'){this.report('grant');this.activate('locked');}
    }catch(error){if(this.generation===generation)this.fallback('threw',error);}
  }
  report(event,reason=this.diagnosis.reason,overrides={}){
    const view=this.doc.defaultView;let embedded=null;try{if(view)embedded=view.self!==view.top;}catch{embedded=true;}
    const a=this.diagnosis.userActivation;
    const detail={event,reason:String(reason||'').slice(0,64),errorName:String(this.diagnosis.errorName||'').slice(0,80),errorMessage:String(this.diagnosis.errorMessage||'').slice(0,500),attempt:this.diagnosis.attempt||0,requestedAt:this.requestedAt,at:Date.now(),supported:typeof this.canvas.requestPointerLock==='function',activation:a?.isActive??null,hasActivation:a?.hasBeenActive??null,actualLocked:this.doc.pointerLockElement===this.canvas,controlsCaptured:this.captured,embedded,focused:typeof this.doc.hasFocus==='function'?this.doc.hasFocus():null,visibility:this.doc.visibilityState||'unknown',...overrides};
    try{this.onDiagnostic(detail);}catch{}
  }
  guardedAttempt(reason){const a=this.doc.defaultView?.navigator?.userActivation;this.report('guarded',reason,{attempt:++this.diagnosticAttempt,requestedAt:Date.now(),errorName:'',errorMessage:'',activation:a?.isActive??null,hasActivation:a?.hasBeenActive??null});}
  consumeReleaseGesture(code){if(!['Escape','Tab'].includes(code)||Date.now()>this.releaseGuardUntil)return false;this.releaseGuardUntil=0;return true;}
  releaseKey(code){if(['Escape','Tab'].includes(code))this.releaseGuardUntil=0;}
  rememberAttempt(){this.lastAttempt={...this.diagnosis,userActivation:this.diagnosis.userActivation?{...this.diagnosis.userActivation}:null};}
  get captureStatus(){const d=this.diagnosis;return {...d,lastAttempt:this.lastAttempt?{...this.lastAttempt,userActivation:this.lastAttempt.userActivation?{...this.lastAttempt.userActivation}:null}:null,userActivation:d.userActivation?{...d.userActivation}:null,supported:typeof this.canvas.requestPointerLock==='function',actualLocked:this.captured,lockedElement:this.doc.pointerLockElement?.id||null,mode:this.mode,pending:this.pending};}
  get captured(){return this.active&&this.mode==='locked'&&this.doc.pointerLockElement===this.canvas;}
  activate(mode){
    if(mode==='locked'&&this.doc.pointerLockElement!==this.canvas){this.fallback();return;}
    if(this.active&&this.mode===mode&&!this.pending)return;
    clearTimeout(this.timer);this.pending=false;this.active=true;this.mode=mode;this.dragging=false;this.hoverX=this.hoverY=null;this.edgeX=this.edgeY=0;this.bounds=null;
    if(mode==='locked'){this.lastBrowserLock=true;this.captureRequested=false;this.diagnosis.state='captured';this.diagnosis.reason='';this.diagnosis.errorName='';this.diagnosis.errorMessage='';this.rememberAttempt();}
    this.canvas.style.cursor=mode==='drag'?'grab':mode==='hover'?'crosshair':mode==='keyboard'?'default':'none';this.onChange(mode);this.canvas.focus?.({preventScroll:true});
    if(mode==='locked')this.report('active',this.active?'':'app-cancelled');
    if(mode==='locked'&&this.active)this.onHint('Mouse locked. Move your mouse to look freely. Escape releases it.');
  }
  fallback(reason='not-confirmed',error=null){
    this.diagnosis.state='fallback';this.diagnosis.reason=reason;
    if(error){this.diagnosis.errorName=String(error.name||'Error');this.diagnosis.errorMessage=String(error.message||error).slice(0,500);}
    this.rememberAttempt();this.report(reason==='unsupported'?'unsupported':reason==='timeout'?'timeout':'rejected');this.activate('hover');this.onHint(captureMessage(this.captureStatus)+' Retry capture or use Open in Chrome. Keyboard-only play remains available.');
  }
  update(dt){
    if(this.active&&this.mode==='locked'&&this.doc.pointerLockElement!==this.canvas){this.releaseGuardUntil=Date.now()+300;this.report('released','browser-release');this.suspend('released');this.onPause();return;}
    if(this.active&&this.mode==='hover'&&(this.edgeX||this.edgeY))this.onLook(this.edgeX*620*Math.min(.05,Math.max(0,dt)),this.edgeY*390*Math.min(.05,Math.max(0,dt)));
  }
  suspend(reason='paused'){
    if(this.pending||this.captured||this.captureRequested)this.report(this.pending?'cancelled':'release-requested',reason);
    if(this.pending){this.diagnosis.state='cancelled';this.diagnosis.reason=reason;this.rememberAttempt();}
    this.diagnosis.state='inactive';this.diagnosis.reason=reason;
    ++this.generation;clearTimeout(this.timer);this.pending=false;this.captureRequested=false;this.active=false;this.mode='inactive';this.dragging=false;this.hoverX=this.hoverY=null;this.edgeX=this.edgeY=0;this.bounds=null;this.canvas.style.cursor='';
    if(this.doc.pointerLockElement===this.canvas)this.doc.exitPointerLock?.();
    if(this.lastBrowserLock&&this.doc.pointerLockElement!==this.canvas){this.lastBrowserLock=false;this.report('released','observed-release');}
  }
  dispose(){this.suspend();for(const off of this.listeners)off();this.listeners=[];}
}

export function captureMessage(status){if(status.actualLocked)return 'Mouse locked. Unlimited turning is active.';if(status.errorName==='UnknownError'&&/bug.*chromium/i.test(status.errorMessage||''))return 'This browser reported an internal mouse-capture error. Open the copied game link in your regular Chrome or Safari window, then click the game there.';if(status.reason==='unsupported')return 'This browser does not provide mouse capture.';if(['rejected','threw','rejected-event'].includes(status.reason))return 'This browser blocked the mouse-capture request.';if(status.reason==='timeout')return 'Mouse capture has not been confirmed by this browser.';if(status.reason==='released')return 'Mouse capture was released.';return 'Cursor is not locked. Capture is required for unrestricted mouse turning.';}
