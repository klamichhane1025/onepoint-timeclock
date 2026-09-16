import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const formError=(message:string)=>json({ok:false,error:message},200);
const validPin=(pin:string)=>/^[A-Za-z0-9]{4,8}$/.test(pin);
function b64url(bytes:Uint8Array){let s="";bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}
function fromB64url(s:string){const p=s.replaceAll("-","+").replaceAll("_","/")+"=".repeat((4-s.length%4)%4);const raw=atob(p);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function pinKey(service:string){const raw=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`onepoint-employee-pin-v1:${service}`));return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"])}
async function encryptPin(pin:string,service:string){const key=await pinKey(service),iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(pin));return `v1.${b64url(iv)}.${b64url(new Uint8Array(ct))}`}
async function decryptPin(cipher:string,service:string){const parts=String(cipher||"").split(".");if(parts.length!==3||parts[0]!=="v1")throw new Error("PIN recovery data is unavailable.");const key=await pinKey(service),pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromB64url(parts[1])},key,fromB64url(parts[2]));return new TextDecoder().decode(pt)}
function parseEmployeeNumber(v:any,required=false){if(v===undefined||v===null||String(v).trim()===""){if(required)throw new Error("Employee ID is required.");return null}const n=Number(String(v).trim());if(!Number.isSafeInteger(n)||n<=0)throw new Error("Employee ID must be a positive whole number.");return n}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return json({error:"Your session has expired. Sign in again."},401);
 const caller=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}}),admin=createClient(url,service,{auth:{persistSession:false}});
 const{data:{user},error:userError}=await caller.auth.getUser();if(userError||!user)return json({error:"Your session has expired. Sign in again."},401);
 let body:any;try{body=await req.json()}catch{return formError("OnePoint could not read the employee form. Please try again.")}
 const action=String(body.action||""),organizationId=String(body.organization_id||"");
 if(!organizationId)return formError("Your organization could not be identified. Refresh the page and try again.");
 const{data:membership,error:membershipError}=await admin.from("organization_users").select("id,role").eq("organization_id",organizationId).eq("user_id",user.id).eq("active",true).in("role",["owner","manager"]).maybeSingle();
 if(membershipError)return json({error:"OnePoint could not verify your access. Please try again."},500);
 if(!membership)return json({error:"Owner or Manager access is required for this employee change."},403);
 const role=String(membership.role);
 const validateStoreJob=async(storeId:string,jobCodeId:string|null)=>{const{data:store,error:storeError}=await admin.from("stores").select("id").eq("id",storeId).eq("organization_id",organizationId).eq("active",true).maybeSingle();if(storeError)throw storeError;if(!store)throw new Error("Choose an active location that belongs to this business.");if(jobCodeId){const{data:job,error:jobError}=await admin.from("job_codes").select("id").eq("id",jobCodeId).eq("organization_id",organizationId).eq("active",true).maybeSingle();if(jobError)throw jobError;if(!job)throw new Error("Choose an active Job Code that belongs to this business.")}};
 const ensureEmployeeNumberAvailable=async(employeeNumber:number,excludeId:string|null=null)=>{let q=admin.from("employees").select("id,employee_number,status").eq("organization_id",organizationId).eq("employee_number",employeeNumber).neq("status","deleted");if(excludeId)q=q.neq("id",excludeId);const{data,error}=await q.limit(1).maybeSingle();if(error)throw error;if(data)throw new Error(`Employee ID ${employeeNumber} already exists for this business. Choose a different ID.`)};
 try{
  if(action==="reveal_pin"){
   const employeeId=String(body.employee_id||"").trim();if(!employeeId)return formError("Employee could not be identified.");
   const{data:employee,error}=await admin.from("employees").select("id,employee_number,name,pin_ciphertext,status").eq("id",employeeId).eq("organization_id",organizationId).eq("status","active").maybeSingle();if(error)throw error;if(!employee)return formError("That employee is no longer active.");if(!employee.pin_ciphertext)return formError("This employee was created before PIN recovery was enabled. Reset the employee PIN once to make it viewable here.");
   const pin=await decryptPin(employee.pin_ciphertext,service);
   await admin.from("audit_logs").insert({organization_id:organizationId,actor_user_id:user.id,action:"employee_pin_viewed",entity_type:"employee",entity_id:employee.id,details:{employee_number:employee.employee_number,actor_role:role}});
   return json({ok:true,employee_id:employee.employee_number,pin});
  }
  if(action==="update_employee_pay"){
   const employeeId=String(body.employee_id||"").trim(),payType=body.pay_type==="hourly"||body.pay_type==="monthly"?body.pay_type:null,payRate=body.pay_rate===""||body.pay_rate==null?null:Number(body.pay_rate);if(!employeeId)return formError("Employee could not be identified. Refresh the page and try again.");if(payRate!=null&&(!Number.isFinite(payRate)||payRate<0))return formError("Enter a valid Pay Amount.");if(payType&&payRate==null)return formError("Enter a Pay Amount for the selected Pay Type.");
   const{data:before,error:bErr}=await admin.from("employees").select("id,employee_number,name,base_pay_type,base_pay_rate,status").eq("id",employeeId).eq("organization_id",organizationId).eq("status","active").maybeSingle();if(bErr)throw bErr;if(!before)return formError("That employee is no longer active.");
   const{data:employee,error:uErr}=await admin.from("employees").update({base_pay_type:payType,base_pay_rate:payRate}).eq("id",employeeId).eq("organization_id",organizationId).select("id,employee_number,name,base_pay_type,base_pay_rate,status").single();if(uErr)throw uErr;
   await admin.from("audit_logs").insert({organization_id:organizationId,actor_user_id:user.id,action:"employee_pay_updated",entity_type:"employee",entity_id:employeeId,details:{actor_role:role,old_pay_type:before.base_pay_type,old_pay_rate:before.base_pay_rate,new_pay_type:payType,new_pay_rate:payRate,effective_for_future_punches:true}});
   return json({ok:true,employee});
  }
  if(action==="create_employee"){
   const name=String(body.name||"").replace(/\s+/g," ").trim(),pin=String(body.pin||"").trim(),storeId=String(body.store_id||"").trim(),jobCodeId=body.job_code_id?String(body.job_code_id):null,payType=body.pay_type==="hourly"||body.pay_type==="monthly"?body.pay_type:null,payRate=body.pay_rate===""||body.pay_rate==null?null:Number(body.pay_rate),employeeNumber=parseEmployeeNumber(body.employee_number,false);if(!name)return formError("Employee Name is required.");if(!validPin(pin))return formError("PIN must be 4 to 8 letters or numbers.");if(!storeId)return formError("Primary Store is required.");if(payRate!=null&&(!Number.isFinite(payRate)||payRate<0))return formError("Enter a valid Pay Amount.");await validateStoreJob(storeId,jobCodeId);if(employeeNumber!=null)await ensureEmployeeNumberAvailable(employeeNumber);
   const pinHash=await bcrypt.hash(pin,12),pinCiphertext=await encryptPin(pin,service);const insertRow:any={organization_id:organizationId,name,pin_hash:pinHash,pin_ciphertext:pinCiphertext,base_pay_type:payType,base_pay_rate:payRate,status:"active"};if(employeeNumber!=null)insertRow.employee_number=employeeNumber;
   const{data:employee,error:empError}=await admin.from("employees").insert(insertRow).select("id,employee_number,name,base_pay_type,base_pay_rate,status").single();if(empError){if(empError.code==="23505"){const msg=String(empError.message||"").toLowerCase();if(msg.includes("name"))return formError("An employee with that name already exists under this business. Please use a different name.");if(employeeNumber!=null)return formError(`Employee ID ${employeeNumber} already exists for this business. Choose a different ID.`);return formError("The automatically generated Employee ID was already in use. Please try again.")}throw empError}
   const{error:sErr}=await admin.from("employee_stores").insert({organization_id:organizationId,employee_id:employee.id,store_id:storeId,is_primary:true});if(sErr)throw sErr;
   if(jobCodeId){const{error:jErr}=await admin.from("employee_job_assignments").insert({organization_id:organizationId,employee_id:employee.id,job_code_id:jobCodeId});if(jErr)throw jErr}
   await admin.from("audit_logs").insert({organization_id:organizationId,actor_user_id:user.id,action:"employee_created",entity_type:"employee",entity_id:employee.id,details:{employee_number:employee.employee_number,employee_number_source:employeeNumber==null?"automatic":"entered",store_id:storeId,job_code_id:jobCodeId,pin_recovery_enabled:true,actor_role:role}});
   return json({ok:true,employee});
  }
  if(action==="update_employee"){
   const employeeId=String(body.employee_id||""),name=String(body.name||"").replace(/\s+/g," ").trim(),storeId=String(body.store_id||"").trim(),jobCodeId=body.job_code_id?String(body.job_code_id):null,pin=String(body.pin||"").trim(),payType=body.pay_type==="hourly"||body.pay_type==="monthly"?body.pay_type:null,payRate=body.pay_rate===""||body.pay_rate==null?null:Number(body.pay_rate),employeeNumber=parseEmployeeNumber(body.employee_number,true);if(!employeeId||!name||!storeId)return formError("Employee, Name, and Primary Store are required.");if(pin&&!validPin(pin))return formError("New PIN must be 4 to 8 letters or numbers.");if(payRate!=null&&(!Number.isFinite(payRate)||payRate<0))return formError("Enter a valid Pay Amount.");await validateStoreJob(storeId,jobCodeId);
   const{data:before,error:bErr}=await admin.from("employees").select("id,employee_number,name,status").eq("id",employeeId).eq("organization_id",organizationId).eq("status","active").maybeSingle();if(bErr)throw bErr;if(!before)return formError("That employee is no longer active.");await ensureEmployeeNumberAvailable(employeeNumber,employeeId);
   const updates:any={name,employee_number:employeeNumber,base_pay_type:payType,base_pay_rate:payRate};if(pin){updates.pin_hash=await bcrypt.hash(pin,12);updates.pin_ciphertext=await encryptPin(pin,service)}
   const{data:employee,error:eErr}=await admin.from("employees").update(updates).eq("id",employeeId).eq("organization_id",organizationId).select("id,employee_number,name,base_pay_type,base_pay_rate,status").single();if(eErr){if(eErr.code==="23505"){const msg=String(eErr.message||"").toLowerCase();if(msg.includes("employee_number"))return formError(`Employee ID ${employeeNumber} already exists for this business. Choose a different ID.`);return formError("An employee with that name already exists under this business. Please use a different name.")}throw eErr}
   const{error:upsertStore}=await admin.from("employee_stores").upsert({organization_id:organizationId,employee_id:employeeId,store_id:storeId,is_primary:true},{onConflict:"employee_id,store_id"});if(upsertStore)throw upsertStore;
   await admin.from("employee_stores").update({is_primary:false}).eq("organization_id",organizationId).eq("employee_id",employeeId).neq("store_id",storeId);
   await admin.from("employee_stores").update({is_primary:true}).eq("organization_id",organizationId).eq("employee_id",employeeId).eq("store_id",storeId);
   if(jobCodeId){const{data:existing}=await admin.from("employee_job_assignments").select("id,job_code_id").eq("organization_id",organizationId).eq("employee_id",employeeId);const keep=(existing||[]).find((x:any)=>x.job_code_id===jobCodeId);if(!keep){const{error:ins}=await admin.from("employee_job_assignments").insert({organization_id:organizationId,employee_id:employeeId,job_code_id:jobCodeId});if(ins)throw ins}const{error:del}=await admin.from("employee_job_assignments").delete().eq("organization_id",organizationId).eq("employee_id",employeeId).neq("job_code_id",jobCodeId);if(del)throw del}else{const{error:del}=await admin.from("employee_job_assignments").delete().eq("organization_id",organizationId).eq("employee_id",employeeId);if(del)throw del}
   await admin.from("audit_logs").insert({organization_id:organizationId,actor_user_id:user.id,action:"employee_updated",entity_type:"employee",entity_id:employeeId,details:{name,old_employee_number:before.employee_number,new_employee_number:employeeNumber,employee_number_changed:Number(before.employee_number)!==employeeNumber,primary_store_id:storeId,job_code_id:jobCodeId,pin_changed:!!pin,secondary_store_assignments_preserved:true,actor_role:role}});
   return json({ok:true,employee});
  }
  if(action==="deactivate_employee"){
   const employeeId=String(body.employee_id||"");if(!employeeId)return formError("Employee could not be identified. Refresh the page and try again.");
   const{data:employee,error}=await admin.from("employees").update({status:"deleted",deleted_at:new Date().toISOString()}).eq("id",employeeId).eq("organization_id",organizationId).select("id,employee_number,name,status").single();if(error)throw error;
   await admin.from("audit_logs").insert({organization_id:organizationId,actor_user_id:user.id,action:"employee_deleted",entity_type:"employee",entity_id:employee.id,details:{employee_number:employee.employee_number,actor_role:role}});
   return json({ok:true,employee});
  }
  return formError("OnePoint does not recognize that employee action. Refresh the page and try again.");
 }catch(error){console.error(error);const raw=error instanceof Error?error.message:String(error||"");if(/employee id .*already exists|employee id must|employee id is required|active location|active job code|belongs to this business/i.test(raw))return formError(raw);return json({error:"OnePoint could not save the employee because of a server error. Please try again. If it continues, contact support."},500)}
});