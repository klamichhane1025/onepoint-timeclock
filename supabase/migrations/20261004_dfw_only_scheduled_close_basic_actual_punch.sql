-- DFW only: scheduled closing is not an automatic punch for Basic stores.
create or replace function private.finalize_all_missed_clockouts()
returns integer language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare v_count integer;
begin
 with closed as (
 update public.time_entries te
 set payable_clock_out=greatest(te.payable_clock_in,te.scheduled_close_at),
 missed_clock_out=true,close_time_adjusted=true,
 system_closed_at=coalesce(te.system_closed_at,now()),updated_at=now()
 where te.is_void=false and te.actual_clock_out is null
 and te.payable_clock_out is null
 and te.payroll_logic_snapshot='dfw'
 and te.scheduled_close_at is not null
 and te.scheduled_close_at+interval '1 hour'<=now()
 returning te.id,te.organization_id,te.employee_id,te.store_id,te.scheduled_close_at,te.payable_clock_out,te.system_closed_at
 ), logged as (
 insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,details)
 select organization_id,null,'missed_clock_out_auto_finalized','time_entry',id,
 jsonb_build_object('employee_id',employee_id,'store_id',store_id,'scheduled_close_at',scheduled_close_at,'grace_period_minutes',60,'auto_close_effective_at',payable_clock_out,'system_finalized_at',system_closed_at,'actual_clock_out_preserved',true)
 from closed returning 1
 )
 select count(*) into v_count from logged;
 return coalesce(v_count,0);
end $$;
create or replace function public.finalize_missed_clockouts(p_organization_id uuid)
returns integer language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare v_count integer;
begin
 if auth.uid() is null or not private.is_org_owner(p_organization_id) then
 raise exception 'Owner access required.' using errcode='42501';
 end if;
 update public.time_entries te
 set payable_clock_out=greatest(te.payable_clock_in,te.scheduled_close_at),
 missed_clock_out=true,close_time_adjusted=true,
 system_closed_at=coalesce(te.system_closed_at,now()),updated_at=now()
 where te.organization_id=p_organization_id and te.is_void=false
 and te.payroll_logic_snapshot='dfw'
 and te.actual_clock_out is null and te.payable_clock_out is null
 and te.scheduled_close_at is not null
 and te.scheduled_close_at+interval '1 hour'<=now();
 get diagnostics v_count=row_count;
 return v_count;
end $$;
create or replace function private.cap_employee_grace_clockout_at_store_close()
returns trigger language plpgsql security definer
set search_path=public,private,pg_temp as $$
begin
 if new.payroll_logic_snapshot='basic'
 and new.actual_clock_out is not null
 and coalesce(new.missed_clock_out,false)=false then
 new.payable_clock_out:=greatest(coalesce(new.payable_clock_in,new.actual_clock_in),new.actual_clock_out);
 new.close_time_adjusted:=false;
 new.early_clock_out:=false;
 elsif new.payroll_logic_snapshot='dfw'
 and old.actual_clock_out is null and new.actual_clock_out is not null
 and coalesce(new.missed_clock_out,false)=false
 and coalesce(new.close_time_adjusted,false)=true
 and new.scheduled_close_at is not null
 and new.actual_clock_out>new.scheduled_close_at
 and new.actual_clock_out<=new.scheduled_close_at+interval '1 hour' then
 new.payable_clock_out:=greatest(coalesce(new.payable_clock_in,new.actual_clock_in),new.scheduled_close_at);
 new.close_time_adjusted:=true;
 end if;
 return new;
end $$;