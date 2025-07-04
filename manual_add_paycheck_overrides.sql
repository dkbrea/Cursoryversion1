-- PaycheckOverrides table for manual paycheck pulse overrides
create table if not exists PaycheckOverrides (
  id bigserial primary key,
  paycheck_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- e.g. 'fixed', 'variable', 'debt', 'goal', etc.
  item_id text not null,
  name text,
  amount numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paycheck_id, user_id, item_id)
);

-- Optional: trigger to update updated_at on row update
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on PaycheckOverrides;
create trigger set_updated_at
before update on PaycheckOverrides
for each row
execute procedure update_updated_at_column();
