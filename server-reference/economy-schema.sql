-- Yokai.exe economy reference schema (PostgreSQL)
-- The live backend remains the source of truth. Client localStorage is preview fallback only.

create table if not exists player_balances (
  player_id uuid primary key,
  rift_coins bigint not null default 0 check (rift_coins >= 0),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists economy_transactions (
  id uuid primary key,
  player_id uuid not null,
  currency text not null check (currency = 'RIFT_COINS'),
  flow text not null check (flow in ('SOURCE','SINK')),
  amount bigint not null check (amount > 0),
  source_type text not null,
  source_id text not null,
  context jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  actor text not null default 'SYSTEM',
  previous_value bigint not null,
  new_value bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists economy_transactions_player_created_idx on economy_transactions(player_id, created_at desc);

create table if not exists rift_progress (
  player_id uuid not null,
  rift_id integer not null,
  first_clear_completed boolean not null default false,
  completion_count integer not null default 0,
  last_completed_at timestamptz,
  daily_repeat_date date,
  daily_repeat_count integer not null default 0,
  primary key (player_id, rift_id)
);

create table if not exists quest_progress (
  player_id uuid not null,
  quest_id text not null,
  cycle_key text not null,
  progress integer not null default 0,
  claimed_at timestamptz,
  primary key (player_id, quest_id, cycle_key)
);

create table if not exists player_weapons (
  player_id uuid not null,
  weapon_id text not null,
  level integer not null default 1 check (level between 1 and 6),
  acquired_at timestamptz not null default now(),
  primary key (player_id, weapon_id)
);

create table if not exists player_entitlements (
  player_id uuid not null,
  entitlement_id text not null,
  quantity integer not null default 1,
  expires_at timestamptz,
  source_order_id text,
  updated_at timestamptz not null default now(),
  primary key (player_id, entitlement_id)
);

create table if not exists star_orders (
  id text primary key,
  player_id uuid not null,
  product_id text not null,
  currency text not null default 'XTR' check (currency = 'XTR'),
  star_price integer not null check (star_price > 0),
  status text not null check (status in ('CREATED','PENDING','PAID','GRANTED','CANCELLED','FAILED','REFUNDED')),
  invoice_payload text not null unique,
  telegram_payment_charge_id text unique,
  telegram_invoice_status text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  granted_at timestamptz,
  refunded_at timestamptz
);

create table if not exists analytics_events (
  id uuid primary key,
  player_id uuid,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
