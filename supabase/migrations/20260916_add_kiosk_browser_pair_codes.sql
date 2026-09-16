create table if not exists private.kiosk_browser_pair_codes (
  id uuid primary key default gen_random_uuid(),
  source_device_id uuid not null references public.kiosk_devices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table private.kiosk_browser_pair_codes enable row level security;

create index if not exists kiosk_browser_pair_codes_source_idx
  on private.kiosk_browser_pair_codes(source_device_id, created_at desc);

create index if not exists kiosk_browser_pair_codes_expiry_idx
  on private.kiosk_browser_pair_codes(expires_at)
  where used_at is null;

revoke all on private.kiosk_browser_pair_codes from anon, authenticated;
grant all on private.kiosk_browser_pair_codes to service_role;
