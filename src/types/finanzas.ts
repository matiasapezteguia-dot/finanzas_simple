export type CurrencyType = 'ARS' | 'USD';

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
  group_id: string | null;
  category_id: string | null;
  currency: CurrencyType;
  initial_amount: number;
  current_amount: number;
  created_at: string;
}

export type MovementType = 'income' | 'expense' | 'transfer' | 'adjustment';

export interface Movement {
  id: string;
  account_id: string;
  movement_type: MovementType;
  category_name: string | null;
  amount: number;
  description: string | null;
  movement_date: string;
  created_at: string;
}

export interface StoreState {
  movements: Movement[];
  accounts: Account[];
  accountGroups: AccountGroup[];
  accountCategories: AccountCategory[];
}

export interface FinanzasStoreContextType extends StoreState {
  addMovement: (movement: Omit<Movement, 'id' | 'created_at'>) => void;
  deleteMovement: (id: string) => void;
  getBalance: (currency: CurrencyType) => number;
  getAccountBalance: (accountId: string) => number;
  getBalancesByGroup: (currency: CurrencyType) => { [key: string]: number };
  getBalancesByCategory: (currency: CurrencyType) => { [key: string]: number };
  addAccount: (account: Omit<Account, 'id' | 'created_at' | 'current_amount'>) => void;
  updateAccount: (updatedAccount: Account) => void;
  deleteAccount: (id: string) => void;
  addAccountGroup: (group: Omit<AccountGroup, 'id' | 'created_at'>) => void;
  updateAccountGroup: (id: string, newName: string) => void;
  deleteAccountGroup: (id: string) => void;
  addAccountCategory: (category: Omit<AccountCategory, 'id' | 'created_at'>) => void;
  updateAccountCategory: (id: string, newName: string) => void;
  deleteAccountCategory: (id: string) => void;
  getAvailableARS: () => number;
  getTotalARSInvestments: () => number;
}