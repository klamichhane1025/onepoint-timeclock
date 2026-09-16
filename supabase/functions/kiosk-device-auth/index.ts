import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED=new Set(["https://timeclock.onepointsystems.io","https://cashier.onepointsystems.io"]);
function cors(req:Request){const o=req.headers.get("origin")||"";return{"Access-Control-Allow-Origin":ALLOWED.has(o)?o:"https://timeclock.onepointsystems.io","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}}
const json=(req:Request,b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"}});
async function sha256Hex(input:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function randomB64(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
function fromB64url(s:string){const p=s.replaceAll("-","+").replaceAll("_","/")+"=".repeat((4-s.length%4)%4);const raw=atob(p);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function requestIp(req:Request){return(req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||(req.headers.get("x-forwarded-for")||"").split(",")[0]||"").trim()||null}
function validJwk(j:any){return j&&j.kty==="EC"&&j.crv==="P-256"&&typeof j.x==="string"&&typeof j.y==="string"}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});
 if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,admin=createClient(url,service,{auth:{persistSession:false}});
 let body:any;try{body=await req.json()}catch{return json(req,{error:"Invalid JSON"},400)}
 const action=String(body.action||"");
 try{
  if(action==="register_recovery"){
   const token=String(body.device_token||""),machineId=String(body.machine_id||"").trim();
   if(token.length<32||machineId.length<12)return json(req,{error:"Device recovery registration is invalid."},400);
   const tokenHash=await sha256Hex(token),{data:device,error}=await admin.from("kiosk_devices").select("id,organization_id,store_id,active,machine_id").eq("token_hash",tokenHash).eq("active",true).maybeSingle();
   if(error||!device)return json(req,{error:"Registered device not found."},401);
   if(device.machine_id&&device.machine_id!==machineId)return json(req,{error:"This device credential belongs to a different registered machine."},401);
   const secret=randomB64(32),recoveryHash=await sha256Hex(secret),now=new Date().toISOString(),ip=requestIp(req);
   const{error:uErr}=await admin.from("kiosk_devices").update({machine_id:machineId,recovery_hash:recoveryHash,recovery_issued_at:now,recovery_last_used_at:null,last_seen_at:now,last_ip:ip}).eq("id",device.id);if(uErr)throw uErr;
   await admin.from("audit_logs").insert({organization_id:device.organization_id,actor_user_id:null,action:"kiosk_device_recovery_registered",entity_type:"kiosk_device",entity_id:device.id,details:{machine_id:machineId,legacy_machine_bound:!device.machine_id}});
   return json(req,{ok:true,recovery_secret:secret,machine_id:machineId});
  }
  if(action==="recover_secret"){
   const machineId=String(body.machine_id||"").trim(),secret=String(body.recovery_secret||"").trim();
   if(machineId.length<12||secret.length<32)return json(req,{error:"This device does not have a valid recovery credential."},401);
   const recoveryHash=await sha256Hex(secret),{data:device,error}=await admin.from("kiosk_devices").select("id,organization_id,store_id,machine_id,active,stores(id,name,store_code,active)").eq("machine_id",machineId).eq("recovery_hash",recoveryHash).eq("active",true).maybeSingle();
   const store:any=(device as any)?.stores;
   if(error||!device||!store||store.active===false)return json(req,{error:"This registered device is no longer active."},401);
   const newToken=randomB64(32),tokenHash=await sha256Hex(newToken),now=new Date().toISOString(),ip=requestIp(req),{error:uErr}=await admin.from("kiosk_devices").update({token_hash:tokenHash,recovery_last_used_at:now,last_seen_at:now,last_ip:ip}).eq("id",device.id);if(uErr)throw uErr;
   await admin.from("audit_logs").insert({organization_id:device.organization_id,actor_user_id:null,action:"kiosk_device_recovered",entity_type:"kiosk_device",entity_id:device.id,details:{machine_id:machineId,network_identity_ignored:true}});
   return json(req,{ok:true,device_token:newToken,machine_id:machineId,store:{id:store.id,name:store.name||store.store_code,store_code:store.store_code}});
  }
  if(action==="register_key"){
   const token=String(body.device_token||""),machineId=String(body.machine_id||"").trim(),jwk=body.public_key_jwk;
   if(token.length<32||machineId.length<12||!validJwk(jwk))return json(req,{error:"Device key registration is invalid."},400);
   const hash=await sha256Hex(token),{data:device,error}=await admin.from("kiosk_devices").select("id,organization_id,store_id,active,machine_id").eq("token_hash",hash).eq("active",true).maybeSingle();
   if(error||!device)return json(req,{error:"Registered device not found."},401);
   if(device.machine_id&&device.machine_id!==machineId)return json(req,{error:"Registered device not found."},401);
   await crypto.subtle.importKey("jwk",jwk,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
   const now=new Date().toISOString(),{error:uErr}=await admin.from("kiosk_devices").update({machine_id:machineId,public_key_jwk:jwk,key_registered_at:now,last_seen_at:now,last_ip:requestIp(req)}).eq("id",device.id);
   if(uErr)throw uErr;
   await admin.from("audit_logs").insert({organization_id:device.organization_id,actor_user_id:null,action:"kiosk_device_key_registered",entity_type:"kiosk_device",entity_id:device.id,details:{machine_id:machineId,legacy_machine_bound:!device.machine_id}});
   return json(req,{ok:true,key_registered:true});
  }
  if(action==="challenge"){
   const machineId=String(body.machine_id||"").trim();if(machineId.length<12)return json(req,{error:"This device is not registered."},404);
   const{data:device,error}=await admin.from("kiosk_devices").select("id,organization_id,store_id,active,machine_id,public_key_jwk").eq("machine_id",machineId).eq("active",true).not("public_key_jwk","is",null).maybeSingle();
   if(error||!device||!validJwk(device.public_key_jwk))return json(req,{error:"This device does not have a trusted device key."},404);
   const since=new Date(Date.now()-10*60*1000).toISOString(),{count}=await admin.schema("private").from("kiosk_device_challenges").select("id",{count:"exact",head:true}).eq("kiosk_device_id",device.id).gte("created_at",since);
   if(Number(count||0)>=20)return json(req,{error:"Too many device verification attempts. Try again shortly."},429);
   const challenge=randomB64(32),expires=new Date(Date.now()+2*60*1000).toISOString(),{data:row,error:iErr}=await admin.schema("private").from("kiosk_device_challenges").insert({kiosk_device_id:device.id,challenge,expires_at:expires}).select("id").single();
   if(iErr)throw iErr;return json(req,{ok:true,challenge_id:row.id,challenge,expires_seconds:120});
  }
  if(action==="verify"){
   const machineId=String(body.machine_id||"").trim(),challengeId=String(body.challenge_id||""),signature=String(body.signature||"");
   if(machineId.length<12||!challengeId||!signature)return json(req,{error:"Device verification data is incomplete."},400);
   const{data:ch,error:cErr}=await admin.schema("private").from("kiosk_device_challenges").select("id,kiosk_device_id,challenge,expires_at,used_at").eq("id",challengeId).maybeSingle();
   if(cErr||!ch||ch.used_at||new Date(ch.expires_at).getTime()<=Date.now())return json(req,{error:"Device verification expired. Try again."},410);
   const{data:device,error:dErr}=await admin.from("kiosk_devices").select("id,organization_id,store_id,machine_id,active,public_key_jwk,stores(id,name,store_code,active)").eq("id",ch.kiosk_device_id).eq("active",true).maybeSingle();
   if(dErr||!device||device.machine_id!==machineId||!validJwk(device.public_key_jwk)||(device as any).stores?.active===false)return json(req,{error:"This registered device is no longer active."},401);
   const key=await crypto.subtle.importKey("jwk",device.public_key_jwk,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]),ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,fromB64url(signature),new TextEncoder().encode(ch.challenge));
   if(!ok)return json(req,{error:"Device signature could not be verified."},401);
   const usedAt=new Date().toISOString(),{data:used,error:useErr}=await admin.schema("private").from("kiosk_device_challenges").update({used_at:usedAt}).eq("id",ch.id).is("used_at",null).select("id").maybeSingle();if(useErr)throw useErr;if(!used)return json(req,{error:"Device verification was already used."},409);
   const newToken=randomB64(32),hash=await sha256Hex(newToken),ip=requestIp(req),{error:uErr}=await admin.from("kiosk_devices").update({token_hash:hash,last_seen_at:usedAt,last_ip:ip}).eq("id",device.id);if(uErr)throw uErr;
   await admin.from("audit_logs").insert({organization_id:device.organization_id,actor_user_id:null,action:"kiosk_device_key_verified",entity_type:"kiosk_device",entity_id:device.id,details:{machine_id:machineId,ip}});
   const store:any=(device as any).stores;return json(req,{ok:true,device_token:newToken,store:{id:store.id,name:store.name||store.store_code,store_code:store.store_code}});
  }
  return json(req,{error:"Unsupported action"},400);
 }catch(e){console.error(e);return json(req,{error:e instanceof Error?e.message:"Unexpected device authentication error"},500)}
});