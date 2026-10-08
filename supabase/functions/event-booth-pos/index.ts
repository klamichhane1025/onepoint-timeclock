
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const originAllow = new Set(["https://timeclock.onepointsystems.io","https://onepoint-timeclock.vercel.app","https://cashier.onepointsystems.io"]);
const eventCode = "HOT-2026";
const cors = (req: Request) => {
 const origin = req.headers.get("origin") || "";
 return {"Access-Control-Allow-Origin":originAllow.has(origin)?origin:"https://timeclock.onepointsystems.io","Vary":"Origin","Access-Control-Allow-Headers":"content-type,apikey,authorization","Access-Control-Allow-Methods":"POST,OPTIONS"};
};
const send = (req: Request, data: unknown, status=200) => new Response(JSON.stringify(data),{status,headers:{...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"}});
const sha = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const safeInt = (v: unknown,max=2147483647) => Number.isSafeInteger(Number(v))&&Number(v)>=0&&Number(v)<=max?Number(v):null;
const statusError = (message:string,status=400) => Object.assign(new Error(message),{status});
Deno.serve(async req=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors(req)});
 if(req.method!=="POST") return send(req,{error:"Method not allowed"},405);
 try{
  const body=await req.json();
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const deviceToken=String(body.device_token||"");
  if(deviceToken.length<32) throw statusError("Open POS on an activated OnePoint Timeclock device.",401);
  const {data:device,error:deviceError}=await admin.from("kiosk_devices").select("id,organization_id,store_id,active").eq("token_hash",await sha(deviceToken)).eq("active",true).maybeSingle();
  if(deviceError||!device) throw statusError("Device registration expired. Reconnect in Timeclock first.",401);
  const {data:store}=await admin.from("stores").select("name,active").eq("id",device.store_id).eq("organization_id",device.organization_id).maybeSingle();
  if(!store?.active) throw statusError("Store is inactive.",403);
  let shift:any,employee:any,sessionHash:string|undefined,sessionToken:string|undefined;
  if(body.action==="login"){
   const number=String(body.employee_number||"").trim(),pin=String(body.pin||"").trim();
   if(!/^\d{1,14}$/.test(number)||!(/^[a-z0-9]{4,8}$/i.test(pin))) throw statusError("Invalid employee ID or PIN.",401);
   const windowStart=new Date(Date.now()-15*60*1000).toISOString();
   const {count}=await admin.from("event_booth_login_attempts").select("*",{count:"exact",head:true}).eq("device_id",device.id).eq("employee_number",number).gte("attempted_at",windowStart);
   if((count||0)>=5) throw statusError("Too many attempts. Retry after 15 minutes.",429);
   const {data:found}=await admin.from("employees").select("id,name,employee_number,pin_hash,status").eq("organization_id",device.organization_id).eq("employee_number",number).eq("status","active").maybeSingle();
   if(!found?.pin_hash||!await bcrypt.compare(pin,found.pin_hash)){
    await admin.from("event_booth_login_attempts").insert({device_id:device.id,employee_number:number});
    throw statusError("Invalid employee ID or PIN.",401);
   }
   employee=found;
   await admin.from("event_booth_login_attempts").delete().eq("device_id",device.id).eq("employee_number",number);
   const {data:existing}=await admin.from("event_booth_shifts").select("*").eq("employee_id",employee.id).eq("event_code",eventCode).is("ended_at",null).maybeSingle();
   if(existing && (existing.store_id!==device.store_id||existing.organization_id!==device.organization_id))
    throw statusError("Employee already has an open shift at another event booth.",409);
   if(existing) shift=existing;
   else {
    const {data:newShift,error:shiftError}=await admin.from("event_booth_shifts").insert({organization_id:device.organization_id,store_id:device.store_id,employee_id:employee.id,event_code:eventCode}).select("*").single();
    if(shiftError){
     if(shiftError.code!=="23505") throw shiftError;
     const {data:retry}=await admin.from("event_booth_shifts").select("*").eq("employee_id",employee.id).eq("event_code",eventCode).is("ended_at",null).single();
     if(!retry||retry.store_id!==device.store_id) throw statusError("Employee shift conflict.",409);
     shift=retry;
    }else shift=newShift;
   }
   const bytes=crypto.getRandomValues(new Uint8Array(32));
   sessionToken=Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("");
   sessionHash=await sha(sessionToken);
   const {error:sessionError}=await admin.from("event_booth_sessions").insert({token_hash:sessionHash,device_id:device.id,employee_id:employee.id,shift_id:shift.id,expires_at:new Date(Date.now()+18*60*60*1000).toISOString()});
   if(sessionError) throw sessionError;
  } else {
   sessionToken=String(body.session_token||"");
   if(!/^[0-9a-f]{64}$/.test(sessionToken)) throw statusError("Sign in again.",401);
   sessionHash=await sha(sessionToken);
   const {data:s,error}=await admin.from("event_booth_sessions").select("shift_id,employee_id,device_id,expires_at").eq("token_hash",sessionHash).eq("device_id",device.id).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(error||!s) throw statusError("POS session expired. Sign in again.",401);
   const {data:foundShift}=await admin.from("event_booth_shifts").select("*").eq("id",s.shift_id).eq("store_id",device.store_id).eq("organization_id",device.organization_id).maybeSingle();
   if(!foundShift||foundShift.ended_at) throw statusError("Shift is closed.",403);
   shift=foundShift;
   const {data:foundEmployee}=await admin.from("employees").select("id,name,employee_number,status").eq("id",s.employee_id).eq("status","active").maybeSingle();
   if(!foundEmployee) throw statusError("Employee unavailable.",403);
   employee=foundEmployee;
  }
  if(body.action==="product"){
   const name=String(body.name||"").trim(),description=String(body.description||"").trim();
   const price=safeInt(body.price_cents),stock=safeInt(body.stock,1000000);
   if(!name||name.length>90||description.length>250||price===null||stock===null) throw statusError("Invalid product details.");
   if(body.product_id){
    const {data:updated,error}=await admin.from("event_booth_products").update({name,description,price_cents:price,stock,active:body.active!==false,updated_at:new Date().toISOString()}).eq("id",String(body.product_id)).eq("organization_id",device.organization_id).eq("store_id",device.store_id).eq("event_code",eventCode).select("id").maybeSingle();
    if(error) throw error;
    if(!updated) throw statusError("Product not found.",404);
   }else{
    const {error}=await admin.from("event_booth_products").insert({organization_id:device.organization_id,store_id:device.store_id,event_code:eventCode,name,description,price_cents:price,stock});
    if(error) throw error;
   }
  }
  if(body.action==="ring"){
   if(!Array.isArray(body.items)||body.items.length<1||body.items.length>25) throw statusError("Empty or oversized cart.");
   if(!["cash","card"].includes(body.payment)) throw statusError("Choose cash or card.");
   const requestId=String(body.request_id||"");
   if(!/^[0-9a-f-]{36}$/i.test(requestId)) throw statusError("Missing unique transaction ID.");
   const {data,error}=await admin.rpc("event_booth_ring",{p_session_hash:sessionHash,p_request_id:requestId,p_payment:body.payment,p_items:body.items});
   if(error) throw error;
   return send(req,{ok:true,sale:data});
  }
  if(body.action==="void"){
   const {data,error}=await admin.rpc("event_booth_void",{p_session_hash:sessionHash,p_sale_id:String(body.sale_id||"")});
   if(error) throw error;
   return send(req,{ok:true,voided:data});
  }
  if(body.action==="close"){
   const amounts=[safeInt(body.float_cents),safeInt(body.counted_cents),safeInt(body.card_settled_cents)];
   if(amounts.some(x=>x===null)) throw statusError("Enter valid closing amounts.");
   const {data,error}=await admin.rpc("event_booth_close",{p_session_hash:sessionHash,p_float:amounts[0],p_counted:amounts[1],p_card:amounts[2]});
   if(error) throw error;
   return send(req,{ok:true,reconciliation:data});
  }
  if(!["login","state","product"].includes(String(body.action))) throw statusError("Unsupported action.");
  const {data:products,error:prodError}=await admin.from("event_booth_products").select("id,name,description,price_cents,stock,active").eq("organization_id",device.organization_id).eq("store_id",device.store_id).eq("event_code",eventCode).order("created_at");
  if(prodError) throw prodError;
  let listing=products||[];
  if(body.action==="login"&&listing.length===0){
   const names=["Chips","Pringles","Squizy Big","Squizy Small","Pashmina Designer"];
   const {error}=await admin.from("event_booth_products").insert(names.map(name=>({name,organization_id:device.organization_id,store_id:device.store_id,event_code:eventCode,price_cents:0,stock:0})));
   if(error) throw error;
   const {data:seed}=await admin.from("event_booth_products").select("id,name,description,price_cents,stock,active").eq("organization_id",device.organization_id).eq("store_id",device.store_id).eq("event_code",eventCode).order("created_at");
   listing=seed||[];
  }
  const {data:sales,error:salesError}=await admin.from("event_booth_sales").select("id,payment,total_cents,created_at,voided_at,event_booth_sale_items(name_snapshot,quantity,price_cents)").eq("shift_id",shift.id).order("created_at",{ascending:false}).limit(250);
  if(salesError) throw salesError;
  const cash=(sales||[]).filter(x=>!x.voided_at&&x.payment==="cash").reduce((n,x)=>n+x.total_cents,0);
  const card=(sales||[]).filter(x=>!x.voided_at&&x.payment==="card").reduce((n,x)=>n+x.total_cents,0);
  const {data:history}=await admin.from("event_booth_shifts").select("id,started_at,ended_at,expected_cash_cents,expected_card_cents,variance_cents").eq("employee_id",employee.id).eq("event_code",eventCode).not("ended_at","is",null).order("ended_at",{ascending:false}).limit(30);
  return send(req,{ok:true,session_token:body.action==="login"?sessionToken:undefined,employee:{id:employee.id,name:employee.name,employee_number:employee.employee_number},store:store.name,shift:{id:shift.id,started_at:shift.started_at},products:listing,sales:sales||[],cash_cents:cash,card_cents:card,history:history||[]});
 }catch(e){
  const err=e as Error&{status?:number};
  console.error("event-booth-pos",err.message);
  return send(req,{error:err.status?err.message:"Unable to complete POS request. Verify database migration and server configuration."},err.status||500);
 }
});
