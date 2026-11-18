/* Durable browser library plus authenticated, revision-safe cloud synchronization. */
const PREFIX='morrowfield.library.v1:';
export const MAX_BYTES=128*1024*1024;
const LARGE_PROJECT_BYTES=16*1024*1024,MAX_REGION_BYTES=24*1024*1024;
const encodedSizes=new WeakMap();
function utf8Length(text){const encoder=new TextEncoder();let total=0;for(let offset=0;offset<text.length;){let end=Math.min(text.length,offset+32768);const last=text.charCodeAt(end-1);if(end<text.length&&last>=0xd800&&last<=0xdbff)end--;total+=encoder.encode(text.slice(offset,end)).length;offset=end;}return total;}
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const clone=value=>JSON.parse(JSON.stringify(value));
const safeGlobal=name=>{try{return globalThis[name];}catch{return undefined;}};
export class ProjectStoreError extends Error {
  constructor(code,message,status=0){super(message);this.name='ProjectStoreError';this.code=code;this.status=status;}
}
function checked(project,{copy=true}={}) {
  if(!project||project.format!=='morrowfield-project'||project.version!==1||typeof project.id!=='string'||!ID.test(project.id)||typeof project.name!=='string'||!project.name.trim()||project.name.length>80)throw new ProjectStoreError('invalid_project','This is not a valid Morrowfield project.');
  if(!project.regions||Array.isArray(project.regions)||typeof project.regions!=='object'||Object.keys(project.regions).length<1||Object.keys(project.regions).length>8||typeof project.activeRegion!=='string'||!Object.hasOwn(project.regions,project.activeRegion))throw new ProjectStoreError('invalid_project','The project needs an active region and at most eight regions.');
  let text;try{text=JSON.stringify(project);}catch{throw new ProjectStoreError('invalid_project','The project could not be encoded.');}
  const bytes=utf8Length(text);if(bytes>MAX_BYTES)throw new ProjectStoreError('project_too_large','Projects are limited to 128 MB. Export this project before reducing its size.');
  const value=copy?JSON.parse(text):project;encodedSizes.set(value,bytes);return value;
}
function summary(record,storage='device') {
  const p=record.project;
  return {id:p.id,name:p.name,activeRegion:p.activeRegion,regionsCount:Object.keys(p.regions||{}).length,updatedAt:p.updatedAt,revision:p.revision??0,pending:!!record.pending,conflict:!!record.conflict,storage};
}
function storageError(error) {
  if(error instanceof ProjectStoreError)return error;
  if(error?.name==='QuotaExceededError'||error?.name==='NS_ERROR_DOM_QUOTA_REACHED')return new ProjectStoreError('storage_full','Browser storage is full. Export a backup and remove an older local project, or sign in to save to the cloud.');
  return new ProjectStoreError('storage_unavailable','This browser cannot keep a durable project copy. Enable browser storage or export your project before leaving.');
}

export class ProjectStore {
  constructor(options={}) {
    this.fetch=Object.hasOwn(options,'fetch')?options.fetch:safeGlobal('fetch')?.bind(globalThis);
    this.indexedDB=Object.hasOwn(options,'indexedDB')?options.indexedDB:safeGlobal('indexedDB');
    this.localStorage=Object.hasOwn(options,'localStorage')?options.localStorage:safeGlobal('localStorage');
    this.regionRefs=new Map();this.baseURL=options.baseURL||'';this.now=options.now||(()=>new Date().toISOString());
    this.timeoutMs=options.timeoutMs??8000;this.transferTimeoutMs=options.transferTimeoutMs??600000;this.storageTimeoutMs=options.storageTimeoutMs??3000;
    this.scope='device';this.session={authenticated:false,displayName:null};this.authenticated=false;this.cloudAvailable=false;this.mode='local';this.message='Projects are saved on this device.';this.db=null;this.storageMode='localstorage';this.initialized=false;
  }
  async init() {
    if(this.initialized)return this.status();
    if(this.indexedDB)try{
      this.db=await new Promise((resolve,reject)=>{
        let settled=false;const finish=(error,value)=>{if(settled){value?.close?.();return;}settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
        const timer=setTimeout(()=>finish(new Error('Browser database opening timed out.')),this.storageTimeoutMs);
        let request;try{request=this.indexedDB.open('morrowfield-project-library-v1',1);}catch(error){finish(error);return;}
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('projects'))request.result.createObjectStore('projects',{keyPath:'key'});};
        request.onsuccess=()=>finish(null,request.result);request.onerror=()=>finish(request.error);request.onblocked=()=>finish(new Error('Browser database is blocked.'));
      });
      this.storageMode='indexeddb';
    }catch{this.db=null;}
    try {
      if(!this.fetch)throw new Error('No network API');
      const {response,data:session}=await this._request('/api/session');
      if(!response.ok)throw new Error('Session API unavailable');
      if(typeof session.authenticated!=='boolean')throw new Error('Not a Morrowfield session API');
      this.session={authenticated:session.authenticated,displayName:typeof session.displayName==='string'?session.displayName:null};this.authenticated=session.authenticated;this.cloudAvailable=true;
      if(this.authenticated){const scope=response.headers.get('x-morrowfield-scope');if(!/^[a-f0-9]{64}$/.test(scope||''))throw new Error('Missing private library scope');this.scope=scope;this.cloudAvailable=true;this.mode='cloud';this.message='Projects are saved to your signed-in account.';}
      else this.message='Saved on this device. Sign in with ChatGPT to use a cloud project library.';
    }catch{
      this.session={authenticated:false,displayName:null};this.authenticated=false;this.cloudAvailable=false;this.scope='device';this.mode='local';this.message='Cloud sign-in is unavailable here. Projects are saved on this device; export a backup to move them.';
    }
    this.initialized=true;return this.status();
  }
  status(){return {cloudAvailable:this.cloudAvailable,authenticated:this.authenticated,displayName:this.session.displayName,mode:this.mode,message:this.message,storageMode:this.storageMode};}
  _key(id){return `${this.scope}/${id}`;}
  async _idb(mode,operation) {
    return new Promise((resolve,reject)=>{
      const tx=this.db.transaction('projects',mode),store=tx.objectStore('projects');let value;
      const timer=setTimeout(()=>{try{tx.abort();}catch{}reject(storageError(new Error('Browser storage timed out.')));},this.storageTimeoutMs);
      const request=operation(store);if(request)request.onsuccess=()=>{value=request.result;};
      tx.oncomplete=()=>{clearTimeout(timer);resolve(value);};tx.onabort=()=>{clearTimeout(timer);reject(storageError(tx.error||request?.error));};tx.onerror=()=>{};
    });
  }
  async _read(id) {
    try {
      if(this.db)return await this._idb('readonly',s=>s.get(this._key(id)))||null;
      if(!this.localStorage)throw new Error('Storage missing');
      const value=this.localStorage.getItem(PREFIX+this._key(id));return value?JSON.parse(value):null;
    }catch(error){throw storageError(error);}
  }
  async _all() {
    try {
      if(this.db)return (await this._idb('readonly',s=>s.getAll())).filter(record=>record.key.startsWith(this.scope+'/'));
      if(!this.localStorage)throw new Error('Storage missing');
      const records=[],prefix=PREFIX+this.scope+'/';
      for(let i=0;i<this.localStorage.length;i++){const key=this.localStorage.key(i);if(key?.startsWith(prefix)){try{const record=JSON.parse(this.localStorage.getItem(key));if(record?.project?.id)records.push(record);}catch{/* A corrupt record cannot erase the rest of the library. */}}}
      return records;
    }catch(error){throw storageError(error);}
  }
  async _write(record) {
    record={...record,key:this._key(record.project.id)};
    try{
      if(this.db){await this._idb('readwrite',s=>s.put(record));return;}
      if(!this.localStorage)throw new Error('Storage missing');
      this.localStorage.setItem(PREFIX+record.key,JSON.stringify(record));
    }catch(error){throw storageError(error);}
  }
  async _delete(id) {
    try{if(this.db)await this._idb('readwrite',s=>s.delete(this._key(id)));else{if(!this.localStorage)throw new Error('Storage missing');this.localStorage.removeItem(PREFIX+this._key(id));}}catch(error){throw storageError(error);}
  }
  async _request(path,options={}) {
    if(!this.fetch)throw new ProjectStoreError('offline','Cloud storage is unreachable.');
    const controller=new AbortController();let timer;
    const transfer=(!options.method&&/^\/api\/projects\/[^/]+$/.test(path))||(options.method==='PUT'&&typeof options.body==='string'&&options.body.length>1024*1024);
    const deadline=transfer?this.transferTimeoutMs:this.timeoutMs;
    const work=(async()=>{
      let response;try{response=await this.fetch(this.baseURL+path,{credentials:'same-origin',cache:'no-store',...options,headers:{accept:'application/json',...options.headers},signal:controller.signal});}catch{throw new ProjectStoreError('offline','Cloud storage is unreachable.');}
      let data;try{data=await response.json();}catch{throw new ProjectStoreError('cloud_unavailable','Cloud storage returned an unreadable response.',response.status);}
      return {response,data};
    })();
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new ProjectStoreError('offline','Cloud storage timed out. Your browser copy is retained.'));},deadline);});
    try{return await Promise.race([work,timeout]);}finally{clearTimeout(timer);}
  }
  async _api(path,options={}) {
    const {response,data}=await this._request(path,options);
    if(!response.ok)throw new ProjectStoreError(data.error||'cloud_unavailable',data.message||'The cloud request failed.',response.status);
    if(response.headers.has('x-morrowfield-region-refs')&&data?.id)try{this.regionRefs.set(data.id,{revision:data.revision,refs:JSON.parse(response.headers.get('x-morrowfield-region-refs'))});}catch{/* Invalid hints cannot change a loaded project. */}
    this.cloudAvailable=true;this.mode='cloud';return data;
  }
  async _putLarge(project) {
    const uploadId=crypto.randomUUID(),path='/api/projects/'+encodeURIComponent(project.id),refs={},known=this.regionRefs.get(project.id),previous=known&&known.revision===project.revision?known.refs:{};
    const headers={'content-type':'application/json','if-match':`"${project.revision||0}"`};
    try {
      for(const [region,world]of Object.entries(project.regions)){
        const body=JSON.stringify(world);if(utf8Length(body)>MAX_REGION_BYTES)throw new ProjectStoreError('region_too_large','Each region is limited to 24 MB. Export a backup before reducing this region.');
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)),digest=[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
        if(previous?.[region]?.digest===digest){refs[region]=previous[region];continue;}
        const uploaded=await this._api(`${path}/uploads/${uploadId}/regions/${encodeURIComponent(region)}`,{method:'PUT',headers:{...headers,'x-morrowfield-content-sha256':digest},body});
        refs[region]={uploadId,digest,bytes:uploaded.bytes};
      }
      const manifest={format:'morrowfield-project-manifest',version:1,id:project.id,name:project.name,activeRegion:project.activeRegion,uploadId,regions:refs};
      const result=await this._api(path+'/commit',{method:'PUT',headers,body:JSON.stringify(manifest)}),ack=result.committed;
      if(!ack||ack.id!==project.id||typeof ack.revision!=='string'||!ID.test(ack.revision)||!Number.isFinite(Date.parse(ack.updatedAt)))throw new ProjectStoreError('cloud_unavailable','The cloud save acknowledgment is invalid. Your device copy is retained.');
      this.regionRefs.set(project.id,{revision:ack.revision,refs:result.regionRefs||refs});
      return {project:{...project,revision:ack.revision,updatedAt:ack.updatedAt}};
    }catch(error){
      // The server claims an upload before finalizing it. Cleanup refuses any
      // batch being committed or already referenced by a completed save.
      await this._api(`${path}/uploads/${uploadId}`,{method:'DELETE'}).catch(()=>{});throw error;
    }
  }
  _offline(error){return error.code==='offline'||error.code==='cloud_unavailable'||error.status>=500;}
  _pendingMessage(){this.cloudAvailable=false;this.mode='offline';this.message='Saved on this device. Cloud sync is pending; keep this browser copy or export a backup.';return this.message;}
  async list() {
    await this.init();let local=[];try{local=await this._all();}catch(error){if(!this.authenticated)throw error;}
    if(!this.authenticated)return local.filter(r=>r.operation!=='delete').map(r=>summary(r)).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
    try {
      const {projects}=await this._api('/api/projects');if(!Array.isArray(projects))throw new ProjectStoreError('cloud_unavailable','The cloud project list is invalid.');
      const merged=new Map(projects.map(p=>[p.id,{...p,pending:false,conflict:false,storage:'cloud'}]));
      for(const record of local)if(record.pending){if(record.operation==='delete')merged.delete(record.project.id);else merged.set(record.project.id,summary(record));}
      this.message=local.some(r=>r.pending)?'Some changes are saved on this device and waiting to sync.':'Your cloud project library is up to date.';
      return [...merged.values()].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
    }catch(error){if(!this._offline(error))throw error;this._pendingMessage();return local.filter(r=>r.operation!=='delete').map(r=>summary(r)).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));}
  }
  async get(id,{preferCloud=false}={}) {
    await this.init();if(!ID.test(id))throw new ProjectStoreError('invalid_id','Invalid project ID.');
    let record=null;try{record=await this._read(id);}catch(error){if(!this.authenticated)throw error;}
    if(!preferCloud&&record?.pending)return record.operation==='delete'?null:clone(record.project);
    if(this.authenticated)try{
      const project=await this._api('/api/projects/'+encodeURIComponent(id));checked(project,{copy:false});
      try{await this._write({project,pending:false,operation:'put',conflict:false});}catch{this.message='Loaded from your account. This browser could not keep an offline copy.';}
      return project;
    }catch(error){
      if(error.status===404){if(record&&!record.pending)await this._delete(id).catch(()=>{});return null;}
      if(!this._offline(error))throw error;this._pendingMessage();
      if(preferCloud)throw new ProjectStoreError('offline','The latest cloud revision could not be loaded. Your local changes are still available.');
    }
    return record&&record.operation!=='delete'?clone(record.project):null;
  }
  async put(input) {
    await this.init();const project=checked(input);project.updatedAt=this.now();
    let records=[];try{records=await this._all();}catch(error){if(!this.authenticated)throw error;}
    if(!records.some(r=>r.project.id===project.id)&&records.filter(r=>r.operation!=='delete').length>=30)throw new ProjectStoreError('project_limit','This device library has 30 projects. Export a backup and remove an older project first.');
    const record={project,pending:this.authenticated,operation:'put',conflict:false};let localError=null;
    try{await this._write(record);}catch(error){localError=error;if(!this.authenticated)throw error;}
    if(!this.authenticated){this.message='Saved on this device. Export a backup to move this project to another browser.';return {project,synced:false,pending:false,message:this.message};}
    try {
      const large=(encodedSizes.get(project)||0)>LARGE_PROJECT_BYTES;
      const result=large?await this._putLarge(project):await this._api('/api/projects/'+encodeURIComponent(project.id),{method:'PUT',headers:{'content-type':'application/json','if-match':`"${project.revision||0}"`},body:JSON.stringify(project)});
      const saved=large?result.project:checked(result.project);let cacheError=null;
      try{await this._write({project:saved,pending:false,operation:'put',conflict:false});}catch(error){cacheError=error;}
      this.message=cacheError?'Saved to your account. This browser could not keep an offline copy.':'Saved to your account and this device.';
      return {project:saved,synced:true,pending:false,message:this.message};
    }catch(error){
      if(!this._offline(error)){
        if(!localError)await this._write({...record,conflict:error.code==='conflict',error:error.code}).catch(()=>{});
        throw error;
      }
      if(localError)throw new ProjectStoreError(localError.code,`${localError.message} Cloud storage is also unavailable; this change has not been saved.`,localError.status);
      return {project,synced:false,pending:true,message:this._pendingMessage()};
    }
  }
  async remove(id,{revision}={}) {
    await this.init();if(!ID.test(id))throw new ProjectStoreError('invalid_id','Invalid project ID.');
    let record=await this._read(id).catch(()=>null);
    if(!record&&this.authenticated){const project=await this.get(id);if(project)record={project,pending:false,operation:'put'};}
    if(!record)return {removed:true,synced:this.authenticated,pending:false,message:'Project already removed.'};
    if(!this.authenticated){await this._delete(id);return {removed:true,synced:false,pending:false,message:'Project removed from this device.'};}
    // A never-synced local project can be deleted without a server request.
    if(!record.project.revision){await this._delete(id);return {removed:true,synced:false,pending:false,message:'Local project removed.'};}
    const pending={...record,pending:true,operation:'delete',conflict:false};await this._write(pending);
    try {
      await this._api('/api/projects/'+encodeURIComponent(id),{method:'DELETE',headers:{'if-match':`"${revision??record.project.revision}"`}});
      await this._delete(id);return {removed:true,synced:true,pending:false,message:'Project removed from your account and this device.'};
    }catch(error){
      if(error.status===404){await this._delete(id);return {removed:true,synced:true,pending:false,message:'Project already removed from your account.'};}
      if(!this._offline(error)){await this._write({...record,conflict:error.code==='conflict'});throw error;}
      this._pendingMessage();return {removed:true,synced:false,pending:true,message:'Removed from this device. Cloud deletion is pending.'};
    }
  }
  async retryPending() {
    await this.init();const result={synced:0,failed:[]};
    if(!this.authenticated)throw new ProjectStoreError('sign_in_required','Sign in to retry cloud synchronization.',401);
    for(const record of await this._all())if(record.pending){
      try{const saved=record.operation==='delete'?await this.remove(record.project.id):await this.put(record.project);if(saved.synced)result.synced++;else result.failed.push({id:record.project.id,code:'offline',message:saved.message});}
      catch(error){result.failed.push({id:record.project.id,code:error.code,message:error.message});}
    }
    return result;
  }
}
