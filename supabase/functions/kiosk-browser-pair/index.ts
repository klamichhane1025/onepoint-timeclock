import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED=new Set(["https://timeclock.onepointsystems.io","https://cashier.onepointsystems.io"]);
const PAIR_TTL_MS=10*60*1000;
const PAIR_CHARS="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function cors(req:Request){const origin=req.headers.get("origin")||"";return{"Access-Control-Allow-Origin":ALLOWED.has(origin)?origin:"https://cashier.onepointsystems.io","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}}
const json=(req:Request,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"}});
async function sha256Hex(input:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function randomToken(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
function randomPairCode(){const b=new Uint8Array(8);crypto.getRandomValues(b);let out="";for(const n of b)out+=PAIR_CHARS[n%PAIR_CHARS.length];return `${out.slice(0,4)}-${out.slice(4)}`}
function normalizeCode(v:unknown){return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}
function requestIp(req:Request){return(req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||(req.headers.get("x-forwarded-for")||"").split(",")[0]||"").trim()||null}
function browserName(ua:string){if(/Edg\//.test(ua))return"Edge";if(/Firefox\//.test(ua))return"Firefox";if(/Chrome\//.test(ua)&&!/Edg\//.test(ua))return"Chrome";if(/Safari\//.test(ua)&&!/Chrome\//.test(ua))return"Safari";return"Browser"}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});
 if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,admin=createClient(url,service,{auth:{persistSession:false}});
 let body:any;try{body=await req.json()}catch{return json(req,{error:"Invalid JSON"},400)}
 const action=String(body.action||"");
 try{
  if(action==="create_pair"){
   const token=String(body.device_token||"");if(token.length<32)return json(req,{error:"This browser is not a trusted POS."},401);
   const tokenHash=await sha256Hex(token),{data:device,error}=await admin.from("kiosk_devices").select("id,organization_id,store_id,label,active,stores(id,name,store_code,active)").eq("token_hash",tokenHash).eq("active",true).maybeSingle();
   const store:any=(device as any)?.stores;if(error||!device||!store||store.active===false)return json(req,{error:"This registered POS is no longer active."},401);
   const now=new Date().toISOString();
   await admin.schema("private").from("kiosk_browser_pair_codes").update({used_at:now}).eq("source_device_id",device.id).is("used_at",null);
   const code=randomPairCode(),codeHash=await sha256Hex(normalizeCode(code)),expiresAt=new Date(Date.now()+PAIR_TTL_MS).toISOString();
   const{error:iErr}=await admin.schema("private").from("kiosk_browser_pair_codes").insert({source_device_id:device.id,organization_id:device.organization_id,store_id:device.store_id,code_hash:codeHash,expires_at:expiresAt});if(iErr)throw iErr;
   await admin.from("audit_logs").insert({organization_id:device.organization_id,actor_user_id:null,action:"kiosk_browser_pair_code_created",entity_type:"kiosk_device",entity_id:device.id,details:{store_id:device.store_id,expires_seconds:Math.floor(PAIR_TTL_MS/1000)}});
   return json(req,{ok:true,code,expires_seconds:Math.floor(PAIR_TTL_MS/1000),pair_url:`https://cashier.onepointsystems.io/#pair=${encodeURIComponent(code)}`,store:{id:store.id,name:store.name||store.store_code,store_code:store.store_code}});
  }
  if(action==="redeem_pair"){
   const normalized=normalizeCode(body.code),machineId=String(body.machine_id||"").trim();if(normalized.length!==8||machineId.length<12)return json(req,{error:"Enter a valid browser-link code."},400);
   const codeHash=await sha256Hex(normalized),{data:pair,error:pErr}=await admin.schema("private").from("kiosk_browser_pair_codes").select("id,source_device_id,organization_id,store_id,expires_at,used_at").eq("code_hash",codeHash).maybeSingle();
   if(pErr||!pair||pair.used_at||new Date(pair.expires_at).getTime()<=Date.now())return json(req,{error:"This browser-link code is invalid or expired. Generate a new code from the registered POS."},401);
   const{data:source,error:sErr}=await admin.from("kiosk_devices").select("id,organization_id,store_id,label,active,stores(id,name,store_code,active)").eq("id",pair.source_device_id).eq("active",true).maybeSingle();
   const store:any=(source as any)?.stores;if(sErr||!source||source.organization_id!==pair.organization_id||source.store_id!==pair.store_id||!store||store.active===false)return json(req,{error:"The source POS or store is no longer active."},401);
   const{data:claimed,error:cErr}=await admin.schema("private").from("kiosk_browser_pair_codes").update({used_at:new Date().toISOString()}).eq("id",pair.id).is("used_at",null).select("id").maybeSingle();if(cErr)throw cErr;if(!claimed)return json(req,{error:"This browser-link code was already used."},409);
   const ua=req.headers.get("user-agent")||"",ip=requestIp(req),browser=browserName(ua),newToken=randomToken(32),tokenHash=await sha256Hex(newToken),now=new Date().toISOString();
   const{data:existing,error:eErr}=await admin.from("kiosk_devices").select("id,store_id,organization_id,active").eq("organization_id",pair.organization_id).eq("machine_id",machineId).eq("active",true).maybeSingle();if(eErr)throw eErr;
   let deviceId:string;
   if(existing){if(existing.store_id!==pair.store_id)return json(req,{error:"This browser is already linked to a different OnePoint location."},409);const{error:uErr}=await admin.from("kiosk_devices").update({token_hash:tokenHash,last_seen_at:now,last_ip:ip,user_agent:ua,activation_method:"browser_pair"}).eq("id",existing.id);if(uErr)throw uErr;deviceId=existing.id}else{
    const baseLabel=String(source.label||store.store_code||"POS").replace(/\s+·\s+(Chrome|Edge|Firefox|Safari|Browser)$/i,"").slice(0,50),label=`${baseLabel} · ${browser}`.slice(0,80);
    const{data:created,error:iErr}=await admin.from("kiosk_devices").insert({organization_id:pair.organization_id,store_id:pair.store_id,label,token_hash:tokenHash,active:true,machine_id:machineId,first_ip:ip,last_ip:ip,user_agent:ua,activation_method:"browser_pair",last_seen_at:now}).select("id").single();if(iErr)throw iErr;deviceId=created.id;
   }
   await admin.from("audit_logs").insert({organization_id:pair.organization_id,actor_user_id:null,action:"kiosk_browser_linked",entity_type:"kiosk_device",entity_id:deviceId,details:{source_device_id:source.id,store_id:pair.store_id,machine_id:machineId,browser,network_identity_ignored:true}});
   return json(req,{ok:true,device_token:newToken,device_id:deviceId,store:{id:store.id,name:store.name||store.store_code,store_code:store.store_code}});
  }
  return json(req,{error:"Unsupported action"},400);
 }catch(e){console.error(e);return json(req,{error:e instanceof Error?e.message:"Unexpected browser pairing error"},500)}
});
