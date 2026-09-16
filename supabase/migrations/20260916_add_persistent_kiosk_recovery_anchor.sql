alter table public.kiosk_devices
  add column if not exists recovery_hash text,
  add column if not exists recovery_issued_at timestamptz,
  add column if not exists recovery_last_used_at timestamptz;

create unique index if not exists kiosk_devices_recovery_hash_uidx
  on public.kiosk_devices(recovery_hash)
  where recovery_hash is not null;

comment on column public.kiosk_devices.recovery_hash is 'SHA-256 hash of the long-lived same-device recovery secret. Never stores the plaintext secret.';
comment on column public.kiosk_devices.recovery_issued_at is 'Timestamp when the current kiosk recovery secret was issued.';
comment on column public.kiosk_devices.recovery_last_used_at is 'Timestamp when the recovery secret last restored a kiosk device token.';
