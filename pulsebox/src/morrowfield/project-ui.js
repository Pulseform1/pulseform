import {ProjectStore} from './project-store.js?v=1.4.0';
const $=selector=>document.querySelector(selector);
const newId=()=>`p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const clone=value=>structuredClone(value);
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);

export function createProjectUI({snapshot,restore,createRegion,regions,notify,status,changed,confirm,store:providedStore}) {
  const store=providedStore||new ProjectStore();
  let current=null,region='meadow',edit=0,timer=null,ready=false,initializing=null,saveChain=Promise.resolve(),session=null,listGeneration=0;
  const acknowledged=new Map(),conflicts=new Set(),deleting=new Set();
  const starting=()=>notify('Project storage is still getting ready. Your world will be ready in a moment.');
  const stopAutosave=()=>{clearTimeout(timer);timer=null;};
  function fresh(name='My little planet'){return {format:'morrowfield-project',version:1,id:newId(),name,activeRegion:'meadow',regions:{},updatedAt:new Date().toISOString()};}
  function regionLabel(){const element=$('#regionName');if(element)element.textContent=regions.find(r=>r.id===region)?.name||'Meadow';}
  function setAccount() {
    const latest=store.status?.()||session||{};
    $('#accountName').textContent=latest.authenticated?`Signed in · ${latest.displayName||'Your account'}`:'Projects on this device';
    const signIn=$('#signInLink');signIn.hidden=!(latest.cloudAvailable&&!latest.authenticated);signIn.href='/signin-with-chatgpt?return_to=%2F';signIn.target='_top';
    $('#projectStatus').textContent=latest.message||(latest.authenticated?'Projects sync with your account.':'This host saves projects on this device. Export a copy for backup.');
  }
  function capture() {
    const data=snapshot();if(!current)current=fresh(data.name||'My little planet');
    current.name=data.name||current.name;current.activeRegion=region;current.regions[region]=data;
    for(const world of Object.values(current.regions))world.name=current.name;
    current.updatedAt=new Date().toISOString();return clone(current);
  }
  function validateProject(data) {
    const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
    if(!plain(data)||data.format!=='morrowfield-project'||data.version!==1||!validId(data.id)||typeof data.name!=='string'||!data.name.trim()||data.name.length>80||/[\u0000-\u001f]/.test(data.name)||!plain(data.regions))throw Error('This is not a valid Morrowfield planet project.');
    const keys=Object.keys(data.regions);
    if(!keys.length||keys.length>8||typeof data.activeRegion!=='string'||!Object.hasOwn(data.regions,data.activeRegion)||keys.some(key=>!regions.some(r=>r.id===key)))throw Error('The project contains an invalid or missing region.');
    if(data.revision!==undefined&&data.revision!==0&&!validId(data.revision))throw Error('The saved project revision is invalid.');
    if(data.updatedAt!==undefined&&(typeof data.updatedAt!=='string'||!Number.isFinite(Date.parse(data.updatedAt))))throw Error('The saved project date is invalid.');
    if(new TextEncoder().encode(JSON.stringify(data)).byteLength>128*1024*1024)throw Error('Project files must be smaller than 128 MB.');
    for(const value of Object.values(data.regions))restore(value,{validateOnly:true});
    const normalized=clone(data);normalized.name=normalized.name.trim();
    for(const world of Object.values(normalized.regions))world.name=normalized.name;
    return normalized;
  }
  function adopt(data,{saved=true}={}) {
    const candidate=validateProject(data),previous=snapshot();
    try{restore(candidate.regions[candidate.activeRegion]);}
    catch(error){try{restore(previous);}catch{}throw error;}
    current=candidate;region=candidate.activeRegion;edit++;regionLabel();
    if(candidate.revision)acknowledged.set(candidate.id,candidate.revision);else acknowledged.delete(candidate.id);
    changed(!saved);status(saved?'Project restored':'Project ready to save');
  }
  function changedWhileWaiting(id,generation) {
    if(current?.id===id&&edit===generation)return false;
    notify('Your world changed while that action was loading. Your edits are still here; try the action again when you are ready.');return true;
  }
  async function persist(data,generation,{quiet=false}={}) {
    const task=saveChain.catch(()=>{}).then(async()=>{
      // Queued snapshots use our latest acknowledged revision, without changing
      // the world data captured at the instant the player pressed Save.
      if(acknowledged.has(data.id))data.revision=acknowledged.get(data.id);
      const result=await store.put(data);
      if(result.project.revision)acknowledged.set(data.id,result.project.revision);
      conflicts.delete(data.id);
      if(current?.id===data.id){
        current.revision=result.project.revision;current.updatedAt=result.project.updatedAt;
        if(generation===edit)changed(false);
        status(result.synced?'Saved to your account':result.pending?'Saved on device · sync pending':'Saved on this device');
      }
      if(!quiet)notify(result.message||(result.synced?'Project saved to your account.':'Project saved on this device.'));
      return result;
    });
    saveChain=task;
    try{return await task;}
    catch(error){
      if(error.code==='conflict'){
        conflicts.add(data.id);stopAutosave();status('Conflict · your device copy is safe');
        notify('A newer cloud copy exists. Your edits are kept on this device. Use “Save as new project” to keep both, or “Load cloud copy” in My projects to discard this device copy.');
      }else{status('Save needs attention');notify(error.message||'Save failed. Export a backup before leaving.');}
      return null;
    }
  }
  async function save({quiet=false}={}) {
    if(!ready){if(!quiet)starting();return null;}
    if(deleting.has(current?.id)){if(!quiet)notify('This project is being deleted. New edits will be kept separately.');return null;}
    stopAutosave();let data;
    try{data=capture();}catch(error){notify(error.message||'The project could not be captured. Export a backup before leaving.');return null;}
    status('Saving project…');return persist(data,edit,{quiet});
  }
  function markChanged() {
    edit++;if(!ready)return;stopAutosave();if(deleting.has(current?.id))return;
    if(conflicts.has(current?.id)){status('Device changes · resolve cloud conflict in My projects');return;}
    timer=setTimeout(()=>{timer=null;void save({quiet:true});},2500);
  }
  async function enterRegion(id) {
    if(!ready){starting();return false;}
    const def=regions.find(r=>r.id===id);if(!def)return false;
    stopAutosave();capture();const previous=snapshot(),previousRegion=region;
    try{
      if(current.regions[id]){const data={...clone(current.regions[id]),name:current.name};restore(data,{validateOnly:true});restore(data);}
      else{createRegion(def);const data=snapshot();data.name=current.name;restore(data,{validateOnly:true});restore(data);}
      region=id;current.activeRegion=id;current.regions[id]=snapshot();current.regions[id].name=current.name;
    }catch(error){region=previousRegion;try{restore(previous);}catch{}throw error;}
    regionLabel();changed(true);markChanged();status('Exploring '+def.name);return true;
  }
  async function openStored(id) {
    if(!ready){starting();return false;}
    const previousId=current.id,generation=edit;
    if(!await save({quiet:true})||changedWhileWaiting(previousId,generation))return false;
    const data=await store.get(id);if(!data)throw Error('Project not found.');
    if(changedWhileWaiting(previousId,generation))return false;
    stopAutosave();adopt(data);$('#projectsPanel').hidden=true;notify('Your project is ready.');return true;
  }
  async function loadCloudCopy(id) {
    if(!ready){starting();return false;}
    const previousId=current.id,generation=edit;
    if(id!==previousId&&(!await save({quiet:true})||changedWhileWaiting(previousId,generation)))return false;
    const accepted=await confirm('Load the cloud copy?','This replaces this project’s device copy with its latest cloud version. To keep your device changes, cancel and use “Save as new project” or Export first. Continue only if you want to discard the device copy.');
    if(!accepted||changedWhileWaiting(previousId,generation))return false;
    stopAutosave();await saveChain.catch(()=>{});if(changedWhileWaiting(previousId,generation))return false;
    const data=await store.get(id,{preferCloud:true});if(!data)throw Error('The cloud project no longer exists. Your open world has not changed.');
    if(changedWhileWaiting(previousId,generation)){await save({quiet:true});return false;}
    stopAutosave();adopt(data);conflicts.delete(id);$('#projectsPanel').hidden=true;notify('The latest cloud copy is open.');return true;
  }
  async function list() {
    const generation=++listGeneration,host=$('#projectList');
    try{
      const projects=await store.list();if(generation!==listGeneration)return;
      host.replaceChildren();setAccount();
      if(!projects.length){const p=document.createElement('p');p.className='project-empty';p.textContent='Your first world starts here. Build something and it saves automatically.';host.append(p);}
      for(const item of projects){
        if(item.conflict)conflicts.add(item.id);
        const card=document.createElement('article');card.className='project-card';const name=document.createElement('strong');name.textContent=item.name||'Untitled planet';
        const detail=document.createElement('small');detail.textContent=(item.conflict?'Cloud conflict · ':item.pending?'Waiting to sync · ':'')+(item.updatedAt?new Date(item.updatedAt).toLocaleDateString():'Saved project');
        const controls=document.createElement('div'),load=document.createElement('button');load.textContent=item.id===current?.id?'Open current':'Open';
        load.onclick=async()=>{try{await openStored(item.id);}catch(error){notify(error.message);}};controls.append(load);
        if(item.conflict||conflicts.has(item.id)){
          const cloud=document.createElement('button');cloud.textContent='Load cloud copy';cloud.onclick=async()=>{try{await loadCloudCopy(item.id);}catch(error){notify(error.message);}};controls.append(cloud);
        }
        const remove=document.createElement('button');remove.textContent='Delete';remove.className='project-delete';
        remove.onclick=async()=>{
          const previousId=current?.id,generation=edit;
          if(!await confirm('Delete this project?',`Delete “${item.name}” from your project library? Export a backup first if you want to keep it.`))return;
          deleting.add(item.id);
          try{
            if(item.id===current?.id)stopAutosave();await saveChain.catch(()=>{});
            const result=await store.remove(item.id,{revision:acknowledged.get(item.id)||item.revision});conflicts.delete(item.id);acknowledged.delete(item.id);
            let keptEdits=false;
            if(current?.id===item.id){
              if(previousId===item.id&&edit!==generation){
                const data=capture();current={...data,id:newId(),name:(data.name.slice(0,75)+' copy').slice(0,80)};delete current.revision;
                for(const world of Object.values(current.regions))world.name=current.name;restore(current.regions[region]);changed(true);keptEdits=true;markChanged();
              }else{
                createRegion({...regions[0],preset:'grassland'});const candidate=fresh('My little planet'),data=snapshot();data.name=candidate.name;candidate.regions.meadow=data;adopt(candidate,{saved:false});
                status('Project deleted · blank meadow is unsaved');
              }
            }
            await list();notify(keptEdits?'Project deleted. Edits made during deletion were kept as a new project.':result.message||'Project removed from your library.');
          }catch(error){notify(error.message);}
          finally{deleting.delete(item.id);}
        };
        controls.append(remove);card.append(name,detail,controls);host.append(card);
      }
    }catch(error){if(generation===listGeneration)$('#projectStatus').textContent=error.message;}
  }
  async function show(){if(!ready){starting();return;}$('#projectsPanel').hidden=false;setAccount();await list();}
  async function startNew(preset='grassland') {
    if(!ready){starting();return false;}if(typeof preset!=='string')preset='grassland';
    const previousId=current.id,generation=edit;
    if(!await save({quiet:true})||changedWhileWaiting(previousId,generation))return false;
    stopAutosave();const previous=snapshot();
    try{const def=regions.find(item=>item.preset===preset)||regions[0];createRegion({...def,preset});const data=snapshot(),candidate=fresh(data.name);candidate.activeRegion=def.id;candidate.regions[def.id]=data;adopt(candidate,{saved:false});}
    catch(error){try{restore(previous);}catch{}throw error;}
    const saved=await save({quiet:true});await list();$('#projectsPanel').hidden=true;
    if(saved)notify('A fresh planet. Your other projects are still in My projects.');return !!saved;
  }
  async function saveAs() {
    if(!ready){starting();return null;}
    stopAutosave();const previousId=current.id,generation=edit,candidate=capture();candidate.id=newId();candidate.name=(candidate.name.slice(0,75)+' copy').slice(0,80);delete candidate.revision;
    for(const world of Object.values(candidate.regions))world.name=candidate.name;
    status('Saving a new project…');const result=await persist(candidate,generation,{quiet:false});if(!result)return null;
    if(changedWhileWaiting(previousId,generation)){notify('The copy was saved in My projects. Your newer edits remain in the open world.');return result;}
    adopt(result.project);await list();return result;
  }
  async function syncNow() {
    if(!ready){starting();return null;}
    try{
      const account=store.status?.()||session||{};
      if(!account.authenticated){notify(account.cloudAvailable?'Sign in with ChatGPT to sync projects. Device projects can be exported for backup.':'This standalone copy saves projects on this device. Export a backup to move them.');return null;}
      if(!await save())return null;const report=await store.retryPending();
      if(report.failed.length){status('Some cloud changes need attention');notify(report.failed[0].message||'Some projects still need attention. Your device copies are retained.');}
      else{status('Projects synced');notify('Your projects are synced.');}
      await list();return report;
    }catch(error){status('Cloud sync needs attention');notify(error.message||'Cloud sync is unavailable. Your device copies are retained.');await list();return null;}
  }
  async function importProject(input) {
    if(!ready)throw Error('Wait for project storage to finish loading before importing.');
    const data=validateProject(input),previousId=current.id,generation=edit;
    if(!await save({quiet:true})||changedWhileWaiting(previousId,generation))throw Error('Save or export your current project before replacing it.');
    const imported={...data,id:newId()};delete imported.revision;stopAutosave();adopt(imported,{saved:false});const saved=await save();
    if(saved)notify('Planet imported into your project library.');return saved;
  }
  function establishCurrentFromWorld(){current=fresh(snapshot().name);region='meadow';capture();regionLabel();}
  async function initialize() {
    const generation=edit;let needsInitialSave=false;
    try{
      session=await store.init();setAccount();const saved=await store.list();const latest=[...saved].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if(latest){
        const data=await store.get(latest.id),validated=validateProject(data);
        if(edit===generation)adopt(validated);else{establishCurrentFromWorld();needsInitialSave=true;notify('Your edits were kept. Earlier projects are available in My projects.');}
      }else{
        if(edit===generation){
          let foundLegacy=false,recovered=false;
          for(const key of ['morrowfield.world.v1','morrowfield.world.backup.v1']){
            try{const legacy=localStorage.getItem(key);if(!legacy)continue;foundLegacy=true;const data=JSON.parse(legacy);restore(data,{validateOnly:true});restore(data);recovered=true;notify(key.includes('.backup.')?'Your earlier backup world was recovered into My projects.':'Your earlier world was recovered into My projects.');break;}
            catch{foundLegacy=true;}
          }
          if(recovered)needsInitialSave=true;
          if(foundLegacy&&!recovered)notify('The older save and backup could not be restored. Import an exported backup if available.');
        }
        if(edit!==generation)needsInitialSave=true;
        establishCurrentFromWorld();
      }
    }catch(error){needsInitialSave=edit!==generation;establishCurrentFromWorld();status('Current world kept · library needs attention');notify(error.message||'Project storage is unavailable. Keep an exported backup before leaving.');}
    finally{ready=true;if(needsInitialSave){changed(true);markChanged();}}
    return session;
  }
  function init(){if(!initializing)initializing=initialize();return initializing;}
  $('#projectToggle').onclick=()=>{void show();};$('#projectsClose').onclick=()=>{$('#projectsPanel').hidden=true;};
  $('#projectNew').onclick=async()=>{try{await startNew();}catch(error){notify(error.message);}};
  $('#projectSaveAs').onclick=async()=>{try{await saveAs();}catch(error){notify(error.message);}};$('#syncNow').onclick=()=>syncNow();
  return {init,save,markChanged,enterRegion,show,startNew,importProject,saveAs,syncNow,loadCloudCopy,isReady:()=>ready,dispose(){stopAutosave();ready=false;},snapshot(){if(!ready)throw Error('Project storage is still loading.');return capture();},get current(){return current},get region(){return region},get ready(){return ready}};
}
