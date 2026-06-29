-- Yokai.exe Global Economy & Combat Integration V1.1
-- PostgreSQL reference schema. Live versioned server config is authoritative.

create table if not exists rift_runs_v11 (
  id uuid primary key,
  player_id uuid not null,
  rift_id integer not null,
  status text not null check (status in ('ACTIVE','COMPLETED','DEFEATED','ABANDONED','TECHNICAL_FAILURE')),
  kills_count integer not null default 0 check (kills_count between 0 and 10),
  pending_coins bigint not null default 0 check (pending_coins >= 0),
  settled_coins bigint not null default 0 check (settled_coins >= 0),
  first_clear_coins bigint not null default 0 check (first_clear_coins >= 0),
  settlement_rate numeric(6,4) not null default 0,
  reset_period date not null,
  early_farm_attempt integer not null default 1 check (early_farm_attempt >= 1),
  economy_config_version text not null,
  combat_config_version text not null,
  content_config_version text not null,
  rift_of_day_multiplier numeric(10,4) not null default 1,
  event_multiplier numeric(10,4) not null default 1,
  started_at timestamptz not null default now(),
  settled_at timestamptz,
  settlement_idempotency_key text unique,
  check ((status = 'ACTIVE' and settled_at is null) or status <> 'ACTIVE')
);

create unique index if not exists one_active_rift_run_per_player_v11
  on rift_runs_v11(player_id)
  where status = 'ACTIVE';

create table if not exists rift_oni_rewards_v11 (
  id uuid primary key,
  run_id uuid not null references rift_runs_v11(id),
  player_id uuid not null,
  oni_index integer not null check (oni_index between 1 and 10),
  is_boss boolean not null default false,
  base_reward bigint not null check (base_reward >= 0),
  rift_of_day_multiplier numeric(10,4) not null,
  anti_farm_multiplier numeric(10,4) not null,
  event_multiplier numeric(10,4) not null,
  awarded_coins bigint not null check (awarded_coins >= 0),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  unique (run_id, oni_index)
);

create table if not exists consumable_reservations_v11 (
  id uuid primary key,
  player_id uuid not null,
  run_id uuid not null references rift_runs_v11(id),
  inventory_item_id uuid not null,
  item_id text not null,
  quantity integer not null check (quantity > 0),
  status text not null check (status in ('RESERVED','CONSUMED','RELEASED')),
  reserved_at timestamptz not null default now(),
  activated_at timestamptz,
  released_at timestamptz,
  unique (run_id, inventory_item_id)
);

create unique index if not exists one_live_reservation_per_inventory_unit_v11
  on consumable_reservations_v11(inventory_item_id)
  where status = 'RESERVED';

create table if not exists seal_activations_v11 (
  id uuid primary key,
  player_id uuid not null,
  run_id uuid not null references rift_runs_v11(id),
  action_id text not null,
  inventory_item_id uuid not null,
  idempotency_key text not null unique,
  activated_at timestamptz not null default now(),
  unique (run_id, action_id)
);

create table if not exists early_farm_counters_v11 (
  player_id uuid not null,
  rift_id integer not null,
  reset_period date not null,
  early_exit_count integer not null default 0 check (early_exit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, rift_id, reset_period)
);

create table if not exists contract_claims_v11 (
  id uuid primary key,
  player_id uuid not null,
  contract_id text not null,
  cycle_key text not null,
  granted_coins bigint not null check (granted_coins >= 0),
  idempotency_key text not null unique,
  claimed_at timestamptz not null default now(),
  unique (player_id, contract_id, cycle_key)
);

-- Settlement transaction invariant:
-- lock run, balance and relevant progress rows in one transaction;
-- validate ACTIVE status; calculate rate from outcome; append one ledger entry;
-- append First Clear separately; update terminal status; commit atomically.
