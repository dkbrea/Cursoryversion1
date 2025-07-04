-- PaycheckOverrides table for manual paycheck editing
CREATE TABLE IF NOT EXISTS PaycheckOverrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paycheck_id UUID NOT NULL,
    user_id UUID NOT NULL,
    type TEXT NOT NULL, -- e.g., 'fixed', 'variable', 'debt', 'savings'
    item_id UUID,       -- nullable if user creates a custom item
    name TEXT,          -- for custom/manual items
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paycheckoverrides_user_paycheck ON PaycheckOverrides(user_id, paycheck_id);
