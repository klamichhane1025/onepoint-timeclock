alter table public.time_entries add column if not exists timezone_snapshot text;

update public.time_entries te
set timezone_snapshot = coalesce(nullif(btrim(s.timezone),''),'UTC')
from public.stores s
where s.id=te.store_id
  and (te.timezone_snapshot is null or btrim(te.timezone_snapshot)='');

update public.time_entries
set timezone_snapshot='UTC'
where timezone_snapshot is null or btrim(timezone_snapshot)='';

create or replace function private.capture_time_entry_timezone()
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
  return new;
end;
$$;

drop trigger if exists trg_capture_time_entry_timezone on public.time_entries;
create trigger trg_capture_time_entry_timezone
before insert on public.time_entries
for each row execute function private.capture_time_entry_timezone();