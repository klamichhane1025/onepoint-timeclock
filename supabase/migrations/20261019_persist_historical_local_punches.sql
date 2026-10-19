
alter table public.time_entries
  add column if not exists actual_clock_in_local timestamp without time zone,
  add column if not exists actual_clock_out_local timestamp without time zone;

update public.time_entries
set actual_clock_in_local = actual_clock_in at time zone timezone_snapshot
where actual_clock_in is not null;

update public.time_entries
set actual_clock_out_local = actual_clock_out at time zone timezone_snapshot
where actual_clock_out is not null;

create or replace function private.capture_time_entry_local_punches()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if new.timezone_snapshot is null or btrim(new.timezone_snapshot)='' then
    select coalesce(nullif(btrim(s.timezone),''),'UTC')
      into new.timezone_snapshot
      from public.stores s
     where s.id=new.store_id;
    new.timezone_snapshot:=coalesce(new.timezone_snapshot,'UTC');
  end if;

  if new.actual_clock_in is distinct from old.actual_clock_in or tg_op='INSERT' then
    new.actual_clock_in_local :=
      case when new.actual_clock_in is null then null
           else new.actual_clock_in at time zone new.timezone_snapshot end;
  end if;

  if new.actual_clock_out is distinct from old.actual_clock_out or tg_op='INSERT' then
    new.actual_clock_out_local :=
      case when new.actual_clock_out is null then null
           else new.actual_clock_out at time zone new.timezone_snapshot end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_capture_time_entry_local_punches on public.time_entries;
create trigger trg_capture_time_entry_local_punches
before insert or update of actual_clock_in,actual_clock_out,timezone_snapshot,store_id
on public.time_entries
for each row
execute function private.capture_time_entry_local_punches();
