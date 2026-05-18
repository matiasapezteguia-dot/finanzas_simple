export type MonedaType = 'ARS' | 'USD';

export interface AccountGroup {
  id: string;
  name: string;
  created_at: string;
}

export interface AccountCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  groupId: string | null;
  categoryId: string | null;
  currency: MonedaType;
  initialAmount: number;
  currentAmount: number;
  created_at: string;
}

export type MovementType = 'income' | 'expense' | 'transfer' | 'adjustment';

export interface Movement {
  id: string;
  cuentaId: string; // Corresponds to Supabase account_id
  tipo: MovementType; // Corresponds to Supabase movement_type
  category_name: string | null;
  monto: number; // Corresponds to Supabase amount
  description: string | null;
  fecha: string; // Corresponds to Supabase movement_date
  currency: MonedaType;
  sourceAccountId?: string; // For transfers
  targetAccountId?: string; // For transfers
  created_at: string;
}

export interface StoreState {
  movements: Movement[];
  accounts: Account[];
  accountGroups: string[]; // Changed to string[] to match initialState in store.tsx
  accountCategories: string[]; // Changed to string[] to match initialState in store.tsx
}

export interface FinanzasStoreContextType extends StoreState {
  addMovement: (movement: Omit<Movement, 'id' | 'created_at'>) => void;
  deleteMovement: (id: string) => void;
  getBalance: (currency: MonedaType) => number;
  getAccountBalance: (accountId: string) => number;
  getBalancesByGroup: (currency: MonedaType) => { [key: string]: number };
  getBalancesByCategory: (currency: MonedaType) => { [key: string]: number };
  addAccount: (account: Omit<Account, 'id' | 'created_at' | 'currentAmount'>) => void;
  updateAccount: (updatedAccount: Account) => void;
  deleteAccount: (id: string) => void;
  addAccountGroup: (group: string) => void; // Changed to string
  updateAccountGroup: (oldName: string, newName: string) => void;
  deleteAccountGroup: (group: string) => void; // Changed to string
  addAccountCategory: (category: string) => void; // Changed to string
  updateAccountCategory: (oldName: string, newName: string) => void;
  deleteAccountCategory: (category: string) => void; // Changed to string
  getAvailableARS: () => number;
  getTotalARSInvestments: () => number;
}
