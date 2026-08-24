-- Sip N Bite: multi-tenant foundation
-- Run in Supabase SQL Editor after connecting the project.

create extension if not exists "pgcrypto";

create type public.staff_role as enum ('super_admin', 'manager', 'chef');
create type public.order_status as enum ('received', 'preparing', 'ready', 'completed', 'rejected');
create type public.payment_method as enum ('cash', 'upi');
create type public.payment_status as enum ('pending', 'submitted', 'paid', 'failed', 'refunded');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  upi_id text,
  platform_fee_percent numeric(5,2) not null default 2.00 check (platform_fee_percent >= 0 and platform_fee_percent <= 100),
  created_at timestamptz not null default now()
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  role public.staff_role not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number text not null,
  label text,
  is_active boolean not null default true,
  unique (restaurant_id, table_number)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  unique (restaurant_id, name)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price_paise integer not null check (price_paise >= 0),
  image_path text,
  is_available boolean not null default true,
  is_chef_special boolean not null default false,
  is_best_seller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^[0-9+() -]{7,20}$'),
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index one_active_session_per_table
  on public.table_sessions(table_id) where status = 'active';

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  table_session_id uuid not null references public.table_sessions(id) on delete restrict,
  order_number bigint generated always as identity unique,
  status public.order_status not null default 'received',
  subtotal_paise integer not null check (subtotal_paise >= 0),
  platform_fee_paise integer not null default 0 check (platform_fee_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  item_name text not null,
  unit_price_paise integer not null check (unit_price_paise >= 0),
  quantity integer not null check (quantity > 0 and quantity <= 50),
  line_total_paise integer not null check (line_total_paise = unit_price_paise * quantity)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount_paise integer not null check (amount_paise > 0),
  provider_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff_profiles where user_id = auth.uid()); $$;

create or replace function public.can_access_restaurant(target_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where user_id = auth.uid()
      and (role = 'super_admin' or restaurant_id = target_restaurant_id)
  );
$$;

alter table public.restaurants enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.table_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

create policy "staff can view permitted restaurants" on public.restaurants for select using (public.can_access_restaurant(id));
create policy "staff can manage permitted restaurants" on public.restaurants for all using (public.can_access_restaurant(id)) with check (public.can_access_restaurant(id));
create policy "staff can view profiles" on public.staff_profiles for select using (user_id = auth.uid() or public.is_staff());

create policy "staff access tables" on public.tables for all using (public.can_access_restaurant(restaurant_id)) with check (public.can_access_restaurant(restaurant_id));
create policy "staff access categories" on public.categories for all using (public.can_access_restaurant(restaurant_id)) with check (public.can_access_restaurant(restaurant_id));
create policy "public reads available menu" on public.menu_items for select using (is_available = true);
create policy "staff manages menu" on public.menu_items for all using (public.can_access_restaurant(restaurant_id)) with check (public.can_access_restaurant(restaurant_id));
create policy "staff access sessions" on public.table_sessions for all using (public.can_access_restaurant(restaurant_id)) with check (public.can_access_restaurant(restaurant_id));
create policy "staff access orders" on public.orders for all using (public.can_access_restaurant(restaurant_id)) with check (public.can_access_restaurant(restaurant_id));
create policy "staff access order items" on public.order_items for all using (exists (select 1 from public.orders o where o.id = order_id and public.can_access_restaurant(o.restaurant_id))) with check (exists (select 1 from public.orders o where o.id = order_id and public.can_access_restaurant(o.restaurant_id)));
create policy "staff access payments" on public.payments for all using (public.can_access_restaurant(restaurant_id)) with check (public.can_access_restaurant(restaurant_id));
create policy "staff access audit logs" on public.audit_logs for select using (public.can_access_restaurant(restaurant_id));

-- Customer inserts must be exposed through a server-side RPC/API route that
-- validates the QR table, active session, menu prices, and totals.