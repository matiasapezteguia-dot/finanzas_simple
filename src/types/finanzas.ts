export type MonedaType = 'ARS' | 'USD';

export interface Account {
  id: string;
  name: string;
  initialAmount: number;
  date: string;
  currency: MonedaType;
  groupId: string;
  categoryId: string;
}

export interface Movement {
  id: string;
  description: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  sourceAccountId?: string;
  targetAccountId?: string;
  amount: number;
  date: string;
  currency: MonedaType;
}

export interface StoreState {
  movements: Movement[];
  accounts: Account[];
  accountGroups: string[];
  accountCategories: string[];
}

export interface FinanzasStoreContextType extends StoreState {
  addMovement: (movement: Omit<Movement, 'id'>) => void;
  deleteMovement: (id: string) => void;
  getBalance: (currency: MonedaType) => number;
  getAccountBalance: (accountId: string) => number;
  getBalancesByGroup: (currency: MonedaType) => { [key: string]: number };
  getBalancesByCategory: (currency: MonedaType) => { [key: string]: number };
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (updatedAccount: Account) => void;
  deleteAccount: (id: string) => void;
  addAccountGroup: (group: string) => void;
  updateAccountGroup: (oldName: string, newName: string) => void;
  deleteAccountGroup: (group: string) => void;
  addAccountCategory: (category: string) => void;
  updateAccountCategory: (oldName: string, newName: string) => void;
  deleteAccountCategory: (category: string) => void;
  getAvailableARS: () => number;
  getTotalARSInvestments: () => number;
}

// Preparación para Entidades Relacionales (Documentación en código):
// Cómo lucirán las interfaces normalizadas basadas en IDs para 'Category' y 'Group'
/*
export interface Category {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
}
*/