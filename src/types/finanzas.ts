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
  nombre: string;
  grupo: string | null;
  categoria: string | null;
  moneda: MonedaType;
  montoInicial: number;
  created_at?: string; // Optional as it might not be always fetched or used
}

export interface MovementTypeItem {
  id: string;
  name: string;
  code: string;
}

export interface Movement {
  id: string;
  cuentaId: string; // Corresponds to Supabase account_id
  movement_type_id: string; // New FK to movement_types
  movement_type_code?: string; // Optional, for easier access
  categoria: string | null; // Corresponds to Supabase category_name
  monto: number; // Corresponds to Supabase amount
  descripcion: string | null; // Corresponds to Supabase description
  fecha: string; // Corresponds to Supabase movement_date
  moneda: MonedaType; // Corresponds to Supabase currency
  sourceAccountId?: string; // For transfers
  targetAccountId?: string; // For transfers
  created_at?: string; // Optional as it might not be always fetched or used
}

export interface StoreState {
  movements: Movement[];
  accounts: Account[];
  accountGroups: string[]; // Changed to string[] to match initialState in store.tsx
  accountCategories: AccountCategory[];
  movementTypes: MovementTypeItem[]; // New: List of movement types
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
