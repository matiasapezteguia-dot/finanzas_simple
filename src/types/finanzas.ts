// ==========================================================
// 1. TIPOS BASE Y ENUMS CONTABLES (SaaS & Multidivisa Ready)
// ==========================================================

export type MonedaType = 'ARS' | 'USD';
export type MovementCodeType = 'income' | 'expense' | 'transfer' | 'adjustment';

// ==========================================================
// 2. ENTIDADES PURAS DEL DOMINIO (Entidades de Negocio)
// ==========================================================

export interface AccountGroup {
  id: string;
  name: string;
  created_at?: string;
}

export interface AccountCategory {
  id: string;
  name: string;
  created_at?: string;
}

export interface MovementTypeItem {
  id: string;
  name: string;      // "Ingreso", "Egreso", "Transferencia", "Ajuste"
  code: string;      // 'income', 'expense', 'transfer', 'adjustment'
}

export interface Account {
  id: string;
  nombre: string;
  grupo: string | null;      // Nombre o ID del grupo dependiente de UI
  categoria: string | null;  // Nombre o ID de categoría dependiente de UI
  moneda: MonedaType;
  montoInicial: number;
  created_at?: string;
}

export interface Movement {
  id: string;
  cuentaId: string;
  movement_type_id: string;
  movement_type_code?: string;
  categoria: string | null;
  monto: number;             // Signado internamente si es relacional
  descripcion: string | null;
  fecha: string;             // YYYY-MM-DD
  moneda: MonedaType;
  sourceAccountId?: string;
  targetAccountId?: string;
  created_at?: string;
}

// ==========================================================
// 3. CONTRATOS DE REPOSITORIO (Abstracción de Persistencia)
// ==========================================================

export interface ITransactionRepository {
  fetchAll(): Promise<Movement[]>;
  save(movement: Omit<Movement, 'id' | 'created_at' | 'movement_type_code'>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAccountRepository {
  fetchAll(): Promise<Account[]>;
  save(account: Omit<Account, 'id' | 'created_at'>): Promise<Account>;
  update(account: Account): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ICatalogRepository {
  fetchGroups(): Promise<string[]>;
  fetchCategories(): Promise<AccountCategory[]>;
  fetchMovementTypes(): Promise<MovementTypeItem[]>;
  addCategory(name: string): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  addGroup(name: string): Promise<void>;
  deleteGroup(id: string): Promise<void>;
}

// ==========================================================
// 4. ESTADO INTERNO DE LA APLICACIÓN (Zustand UI State)
// ==========================================================

export interface StoreState {
  movements: Movement[];
  accounts: Account[];
  accountGroups: string[];
  accountCategories: AccountCategory[];
  movementTypes: MovementTypeItem[];
}

export interface FinanzasStoreContextType extends StoreState {
  fetchInitialData: () => Promise<void>; // Asegurado método de sincronización
  addMovement: (movement: Omit<Movement, 'id' | 'created_at'>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  getAccountBalance: (accountId: string) => number;
  getTotalARS: () => number;
  getAvailableARS: () => number;
  getTotalARSInvestments: () => number;
  getTotalUSD: () => number;
  addAccount: (account: Omit<Account, 'id' | 'created_at'>) => Promise<void>;
  updateAccount: (updatedAccount: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addAccountGroup: (group: string) => Promise<void>;
  updateAccountGroup: (oldName: string, newName: string) => Promise<void>;
  deleteAccountGroup: (group: string) => Promise<void>;
  addAccountCategory: (category: string) => Promise<void>;
  updateAccountCategory: (oldName: string, newName: string) => Promise<void>;
  deleteAccountCategory: (category: string) => Promise<void>;
}