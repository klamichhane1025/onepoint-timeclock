
-- Additive, event-only POS schema; existing time_entries and payroll objects are unchanged.
create table if not exists public.event_booth_products (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 store_id uuid not null references public.stores(id),
 event_code text not null default 'HOT-2026',
 name text not null check (length(trim(name)) between 1 and 90),
 description text not null default '',
 price_cents integer not null default 0 check (price_cents >= 0),
 stock integer not null default 0 check (stock >= 0),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists event_booth_products_scope on public.event_booth_products (organization_id,store_id,event_code);
create table if not exists public.event_booth_shifts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 store_id uuid not null references public.stores(id),
 employee_id uuid not null references public.employees(id),
 event_code text not null,
 started_at timestamptz not null default now(),
 ended_at timestamptz,
 float_cents integer check (float_cents >= 0),
 counted_cents integer check (counted_cents >= 0),
 card_settled_cents integer check (card_settled_cents >= 0),
 expected_cash_cents integer,
 expected_card_cents integer,
 variance_cents integer
);
create unique index if not exists event_booth_one_open_shift on public.event_booth_shifts (event_code, employee_id) where ended_at is null;
create table if not exists public.event_booth_sales (
 id uuid primary key default gen_random_uuid(),
 shift_id uuid not null references public.event_booth_shifts(id),
 request_id uuid not null,
 payment text not null check (payment in ('cash','card')),
 total_cents integer not null default 0 check (total_cents >= 0),
 created_at timestamptz not null default now(),
 voided_at timestamptz,
 unique(shift_id,request_id)
);
create table if not exists public.event_booth_sale_items (
 id uuid primary key default gen_random_uuid(),
 sale_id uuid not null references public.event_booth_sales(id),
 product_id uuid not null references public.event_booth_products(id),
 name_snapshot text not null,
 price_cents integer not null,
 quantity integer not null check (quantity > 0)
);
create table if not exists public.event_booth_sessions (
 token_hash text primary key,
 device_id uuid not null references public.kiosk_devices(id),
 shift_id uuid not null references public.event_booth_shifts(id),
 employee_id uuid not null references public.employees(id),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table if not exists public.event_booth_login_attempts (
 device_id uuid not null references public.kiosk_devices(id),
 employee_number text not null,
 attempted_at timestamptz not null default now()
);
create index if not exists event_booth_attempts_lookup on public.event_booth_login_attempts (device_id,employee_number,attempted_at);
alter table public.event_booth_products enable row level security;
alter table public.event_booth_shifts enable row level security;
alter table public.event_booth_sales enable row level security;
alter table public.event_booth_sale_items enable row level security;
alter table public.event_booth_sessions enable row level security;
alter table public.event_booth_login_attempts enable row level security;
revoke all on public.event_booth_products, public.event_booth_shifts, public.event_booth_sales, public.event_booth_sale_items, public.event_booth_sessions, public.event_booth_login_attempts from anon, authenticated;

-- All inventory mutations and sales persist atomically with row locks.
create or replace function public.event_booth_ring(p_session_hash text, p_request_id uuid, p_payment text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s record; existing record; line record; product record; sale_id uuid; total bigint := 0; count_items integer := 0;
begin
 select es.shift_id, es.employee_id, sh.store_id, sh.organization_id, sh.event_code
 into s from public.event_booth_sessions es
 join public.event_booth_shifts sh on sh.id=es.shift_id
 where es.token_hash=p_session_hash and es.expires_at>now() and sh.ended_at is null;
 if not found then raise exception 'Session expired or shift closed'; end if;
 perform 1 from public.event_booth_shifts where id=s.shift_id for update;
 select id,total_cents into existing from public.event_booth_sales where shift_id=s.shift_id and request_id=p_request_id;
 if found then return jsonb_build_object('id',existing.id,'total_cents',existing.total_cents,'duplicate',true); end if;
 if p_payment not in ('cash','card') or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 25 then
 raise exception 'Invalid checkout'; end if;
 for line in select (value->>'product_id')::uuid as product_id, sum((value->>'quantity')::int) as quantity
 from jsonb_array_elements(p_items) value group by (value->>'product_id')::uuid order by 1 loop
 if line.quantity < 1 or line.quantity > 999 then raise exception 'Invalid quantity'; end if;
 select * into product from public.event_booth_products
 where id=line.product_id and organization_id=s.organization_id and store_id=s.store_id and event_code=s.event_code and active=true
 for update;
 if not found or product.stock < line.quantity or product.price_cents < 1 then raise exception 'Product unavailable or insufficient inventory'; end if;
 count_items:=count_items+1;
 total:=total+(product.price_cents::bigint*line.quantity);
 if total>2147483647 then raise exception 'Sale amount too high'; end if;
 end loop;
 insert into public.event_booth_sales(shift_id,request_id,payment,total_cents) values(s.shift_id,p_request_id,p_payment,total::int) returning id into sale_id;
 for line in select (value->>'product_id')::uuid as product_id, sum((value->>'quantity')::int) as quantity
 from jsonb_array_elements(p_items) value group by (value->>'product_id')::uuid order by 1 loop
 select * into product from public.event_booth_products where id=line.product_id for update;
 insert into public.event_booth_sale_items(sale_id,product_id,name_snapshot,price_cents,quantity)
 values(sale_id,product.id,product.name,product.price_cents,line.quantity);
 update public.event_booth_products set stock=stock-line.quantity,updated_at=now() where id=product.id;
 end loop;
 return jsonb_build_object('id',sale_id,'total_cents',total);
end $$;

create or replace function public.event_booth_close(p_session_hash text, p_float integer, p_counted integer, p_card integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s record; cash_total bigint; card_total bigint; variance bigint;
begin
 select sh.* into s from public.event_booth_sessions es join public.event_booth_shifts sh on sh.id=es.shift_id
 where es.token_hash=p_session_hash and es.expires_at>now() for update of sh;
 if not found or s.ended_at is not null then raise exception 'Shift is not open'; end if;
 if p_float<0 or p_counted<p_float or p_card<0 or p_float is null or p_counted is null or p_card is null then raise exception 'Invalid closing amounts'; end if;
 select coalesce(sum(total_cents) filter(where payment='cash'),0),
 coalesce(sum(total_cents) filter(where payment='card'),0) into cash_total,card_total
 from public.event_booth_sales where shift_id=s.id and voided_at is null;
 variance:=p_counted::bigint-p_float::bigint+p_card::bigint-cash_total-card_total;
 if abs(variance)>2147483647 then raise exception 'Variance out of range'; end if;
 update public.event_booth_shifts set ended_at=now(),float_cents=p_float,counted_cents=p_counted,card_settled_cents=p_card,
 expected_cash_cents=cash_total::int,expected_card_cents=card_total::int,variance_cents=variance::int where id=s.id;
 delete from public.event_booth_sessions where shift_id=s.id;
 return jsonb_build_object('shift_id',s.id,'expected_cash_cents',cash_total,'expected_card_cents',card_total,'variance_cents',variance);
end $$;

create or replace function public.event_booth_void(p_session_hash text,p_sale_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare s record; sale record; line record;
begin
 select sh.* into s from public.event_booth_sessions es join public.event_booth_shifts sh on sh.id=es.shift_id
 where es.token_hash=p_session_hash and es.expires_at>now() and sh.ended_at is null for update of sh;
 if not found then raise exception 'Shift is not open'; end if;
 select * into sale from public.event_booth_sales where id=p_sale_id and shift_id=s.id for update;
 if not found or sale.voided_at is not null then raise exception 'Sale not eligible for void'; end if;
 for line in select * from public.event_booth_sale_items where sale_id=p_sale_id order by product_id loop
 update public.event_booth_products set stock=stock+line.quantity,updated_at=now() where id=line.product_id;
 end loop;
 update public.event_booth_sales set voided_at=now() where id=p_sale_id;
 return true;
end $$;
revoke all on function public.event_booth_ring(text,uuid,text,jsonb), public.event_booth_close(text,integer,integer,integer), public.event_booth_void(text,uuid) from public, anon, authenticated;
grant execute on function public.event_booth_ring(text,uuid,text,jsonb), public.event_booth_close(text,integer,integer,integer), public.event_booth_void(text,uuid) to service_role;
