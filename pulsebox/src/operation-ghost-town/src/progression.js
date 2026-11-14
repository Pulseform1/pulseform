import {normalizeProfile,purchase,equip,claimReward} from '../shared/progression.js';
import {claimMission} from '../shared/debrief.js';
export class Progression{
constructor(storage){this.storage=storage;this.profile=normalizeProfile();this.persistent=true;try{this.storage||=globalThis.localStorage;this.profile=normalizeProfile(JSON.parse(this.storage.getItem('ghost-armory-v1')||'{}'))}catch{this.persistent=false}}
save(){try{this.storage.setItem('ghost-armory-v1',JSON.stringify(this.profile))}catch{this.persistent=false}}
buy(kind,id){const result=purchase(this.profile,kind,id);if(result.ok)this.save();return result}
equip(id,slot){const ok=equip(this.profile,id,slot);if(ok)this.save();return ok}
reward(event){const amount=claimReward(this.profile,event);if(amount)this.save();return amount}
mission(id,matchId,report){const amount=claimMission(this.profile,id,matchId,report);if(amount)this.save();return amount}
complete(id){if(!this.profile.completed.includes(id)){this.profile.completed.push(id);this.save()}}
}
