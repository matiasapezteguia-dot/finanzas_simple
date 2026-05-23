-- Create ENUM for currencies
CREATE TYPE public.currency_enum AS ENUM ('ARS', 'USD');

-- Create ENUM for account types
CREATE TYPE public.account_type_enum AS ENUM ('bancaria', 'billetera', 'cripto');

-- Table: public.movement_types
CREATE TABLE public.movement_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    code text NOT NULL UNIQUE
);
ALTER TABLE public.movement_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public movement types are viewable by everyone." ON public.movement_types FOR SELECT USING (true);


-- Table: public.profiles (to extend Supabase auth.users)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Table: public.accounts
CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    currency currency_enum NOT NULL,
    type account_type_enum NOT NULL,
    initial_balance numeric DEFAULT 0 NOT NULL,
    current_balance numeric DEFAULT 0 NOT NULL
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso cuentas" ON public.accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table: public.categories
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    group_name text
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public categories are viewable by everyone." ON public.categories FOR SELECT USING (true);

-- Table: public.transactions
CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL, -- Nullable for transfers
    movement_type_id uuid REFERENCES public.movement_types(id) ON DELETE RESTRICT NOT NULL,
    amount numeric NOT NULL,
    description text,
    transaction_date date DEFAULT now() NOT NULL,
    related_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL, -- Self-referencing for transfers
    currency currency_enum NOT NULL,
    exchange_rate numeric
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso transacciones" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Create functions and triggers for balance calculation
-- Function to update account balance on new/update/delete transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    old_amount NUMERIC;
    old_movement_type_code text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT mt.code INTO old_movement_type_code FROM public.movement_types mt WHERE mt.id = NEW.movement_type_id;
        IF old_movement_type_code = 'ingreso' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF old_movement_type_code = 'egreso' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF old_movement_type_code = 'transferencia' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF old_movement_type_code = 'ajuste' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id; -- Assuming adjustment can be positive or negative, handle in app
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert old amount and apply new amount
        SELECT t.amount, mt.code INTO old_amount, old_movement_type_code FROM public.transactions t JOIN public.movement_types mt ON t.movement_type_id = mt.id WHERE t.id = OLD.id;

        IF old_movement_type_code = 'ingreso' THEN
            UPDATE public.accounts SET current_balance = current_balance - old_amount WHERE id = OLD.account_id;
        ELSIF old_movement_type_code = 'egreso' THEN
            UPDATE public.accounts SET current_balance = current_balance + old_amount WHERE id = OLD.account_id;
        ELSIF old_movement_type_code = 'transferencia' THEN
            UPDATE public.accounts SET current_balance = current_balance + old_amount WHERE id = OLD.account_id;
        ELSIF old_movement_type_code = 'ajuste' THEN
            UPDATE public.accounts SET current_balance = current_balance - old_amount WHERE id = OLD.account_id;
        END IF;

        SELECT mt.code INTO old_movement_type_code FROM public.movement_types mt WHERE mt.id = NEW.movement_type_id;
        IF old_movement_type_code = 'ingreso' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF old_movement_type_code = 'egreso' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF old_movement_type_code = 'transferencia' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF old_movement_type_code = 'ajuste' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        SELECT mt.code INTO old_movement_type_code FROM public.movement_types mt WHERE mt.id = OLD.movement_type_id;
        IF old_movement_type_code = 'ingreso' THEN
            UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF old_movement_type_code = 'egreso' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF old_movement_type_code = 'transferencia' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF old_movement_type_code = 'ajuste' THEN
            UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function after insert/update/delete on transactions
CREATE TRIGGER update_account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Function to handle transfers as two transactions, one outflow and one inflow
CREATE OR REPLACE FUNCTION handle_transfer_transaction()
RETURNS TRIGGER AS $$
DECLARE
    transfer_amount NUMERIC;
    target_account_id UUID;
    target_currency currency_enum;
    converted_amount NUMERIC;
    movement_code text;
BEGIN
    SELECT mt.code INTO movement_code FROM public.movement_types mt WHERE mt.id = NEW.movement_type_id;
    IF movement_code = 'transferencia' AND NEW.related_transaction_id IS NULL THEN
        -- This is the *initiating* leg of a transfer (outflow from source account)
        -- Create the corresponding inflow transaction for the target account

        -- Assuming description for transfer will contain info about target account
        -- Or we might need an explicit target_account_id in the transaction table for transfers
        -- For simplicity, let's assume `description` helps identify the other leg, or better,
        -- let's require `related_transaction_id` to be set explicitly during API call
        -- For now, let's simplify: if `related_transaction_id` is null and type is 'transfer', it's an outflow.
        -- The inflow will be created as a separate insert with related_transaction_id pointing back.

        -- To correctly handle transfers, especially cross-currency ones,
        -- it's better to manage this logic in the application layer or create a stored procedure
        -- that takes two account IDs, amounts, and currency, and creates two linked transactions.

        -- For the purpose of database-level trigger, if a 'transfer' is inserted without `related_transaction_id`
        -- let's assume it's the debit side and simply update balance for the source account.
        -- The credit side will be a separate insert.

        -- *** Advanced: For a full two-sided transfer at the DB level, a more complex trigger or stored procedure is needed.
        -- This MVP trigger will only handle the balance update for the current transaction, assuming
        -- the application creates both legs of the transfer and links them with `related_transaction_id`.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle transfer logic (optional, can be done in application layer)
-- CREATE TRIGGER handle_transfer_trigger
-- BEFORE INSERT ON public.transactions
-- FOR EACH ROW EXECUTE FUNCTION handle_transfer_transaction();

-- Initial balance calculation for existing accounts (if any, on first setup)
UPDATE public.accounts
SET current_balance = (
    SELECT COALESCE(SUM(CASE
        WHEN mt.code = 'ingreso' THEN T.amount
        WHEN mt.code = 'egreso' THEN -T.amount
        WHEN mt.code = 'transferencia' THEN
            -- If it's a transfer *from* this account (assuming positive amount means outflow)
            -- For transfers, this needs careful logic. A simple sum might not be correct
            -- if one transfer represents an inflow and another an outflow with the same type.
            -- Better to differentiate transfers to/from or handle in application.
            -- For now, assuming 'transfer' is an outflow from `account_id` for simplicity
            -T.amount
        WHEN mt.code = 'ajuste' THEN T.amount
        ELSE 0
    END), 0)
    FROM public.transactions T JOIN public.movement_types mt ON T.movement_type_id = mt.id
    WHERE T.account_id = public.accounts.id
) + initial_balance;

-- Insert default movement types if they don't exist
INSERT INTO public.movement_types (name, code)
VALUES
    ('Ingreso', 'ingreso'),
    ('Egreso', 'egreso'),
    ('Transferencia', 'transferencia'),
    ('Ajuste', 'ajuste')
ON CONFLICT (code) DO NOTHING;
