import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export interface Account {
  id: string;
  name: string;
  initialAmount: number;
  date: string;
  currency: 'ARS' | 'USD';
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
  currency: 'ARS' | 'USD';
}

interface StoreState {
  movements: Movement[];
  accounts: Account[];
  accountGroups: string[];
  accountCategories: string[];
}

interface FinanzasStoreContextType extends StoreState {
  addMovement: (movement: Omit<Movement, 'id'>) => void;
  deleteMovement: (id: string) => void;
  getBalance: (currency: 'ARS' | 'USD') => number;
  getAccountBalance: (accountId: string) => number;
  getBalancesByGroup: (currency: 'ARS' | 'USD') => { [key: string]: number };
  getBalancesByCategory: (currency: 'ARS' | 'USD') => { [key: string]: number };
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

const LOCAL_STORAGE_KEY = 'finanzasStore';

const initialState: StoreState = {
  movements: [],
  accounts: [],
  accountGroups: ['Banco', 'Cheque', 'Efectivo'],
  accountCategories: ['Inversiones', 'Uso Diario', 'Cripto'],
};

const loadState = (): StoreState => {
  if (typeof window === 'undefined') {
    return initialState;
  }

  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return initialState;
    }
    const storedState: StoreState = JSON.parse(serializedState);
    return {
      ...initialState,
      ...storedState,
      accounts: storedState.accounts || initialState.accounts,
      accountGroups: storedState.accountGroups || initialState.accountGroups,
      accountCategories:
        storedState.accountCategories || initialState.accountCategories,
    };
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
    return initialState;
  }
};

const saveState = (state: StoreState) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
  } catch (error) {
    console.error('Error saving state to localStorage:', error);
  }
};

const FinanzasContext = createContext<FinanzasStoreContextType | undefined>(undefined);

export const FinanzasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoreState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addMovement = (movement: Omit<Movement, 'id'>) => {
    const newMovement: Movement = {
      ...movement,
      id: Date.now().toString(),
    };
    setState((prevState) => {
      const newState = { ...prevState, movements: [...prevState.movements, newMovement] };
      // No es necesario actualizar el balance de la cuenta aquí, ya que getAccountBalance lo calcula dinámicamente.
      return newState;
    });
  };

  const getBalance = (currency: 'ARS' | 'USD'): number => {
    return state.accounts
      .filter((account) => account.currency === currency)
      .reduce((total, account) => total + getAccountBalance(account.id), 0);
  };

  const getAccountBalance = (accountId: string): number => {
    const account = state.accounts.find(acc => acc.id === accountId);
    if (!account) return 0;

    let balance = account.initialAmount;

    state.movements
      .filter(m => m.currency === account.currency) // Filter movements by account currency
      .forEach(m => {
        if (m.type === 'adjustment') {
          if (m.targetAccountId === accountId) {
            balance += m.amount;
          }
        } else { // For 'income', 'expense', 'transfer'
          if (m.targetAccountId === accountId) {
            balance += m.amount;
          } else if (m.sourceAccountId === accountId) {
            balance -= m.amount;
          }
        }
      });
    return balance;
  };

  const getBalancesByGroup = (currency: 'ARS' | 'USD') => {
    const balances: { [key: string]: number } = {};
    state.accountGroups.forEach(group => {
      balances[group] = 0;
    });

    state.accounts
      .filter(account => account.currency === currency)
      .forEach(account => {
        const currentBalance = getAccountBalance(account.id);
        balances[account.groupId] += currentBalance;
      });
    return balances;
  };

  const getBalancesByCategory = (currency: 'ARS' | 'USD') => {
    const balances: { [key: string]: number } = {};
    state.accountCategories.forEach(category => {
      balances[category] = 0;
    });

    state.accounts
      .filter(account => account.currency === currency)
      .forEach(account => {
        const currentBalance = getAccountBalance(account.id);
        balances[account.categoryId] += currentBalance;
      });
    return balances;
  };

  const addListItem = (listName: keyof StoreState, item: string) => {
    setState((prevState) => {
      const currentList = prevState[listName] as string[];
      if (!currentList.includes(item)) {
        return { ...prevState, [listName]: [...currentList, item] };
      }
      return prevState;
    });
  };

  const deleteListItem = (listName: keyof StoreState, item: string) => {
    setState((prevState) => {
      const currentList = prevState[listName] as string[];
      return { ...prevState, [listName]: currentList.filter((i) => i !== item) };
    });
  };

  const updateListItem = (listName: keyof StoreState, oldItem: string, newItem: string) => {
    setState((prevState) => {
      const currentList = prevState[listName] as string[];
      const updatedList = currentList.map((item) => (item === oldItem ? newItem : item));

      const updatedAccounts = prevState.accounts.map(account => {
        let accountChanged = false;
        const newAccount = { ...account };
        if (listName === 'accountGroups' && account.groupId === oldItem) {
          newAccount.groupId = newItem;
          accountChanged = true;
        }
        if (listName === 'accountCategories' && account.categoryId === oldItem) {
          newAccount.categoryId = newItem;
          accountChanged = true;
        }
        return accountChanged ? newAccount : account;
      });

      return { ...prevState, [listName]: updatedList, accounts: updatedAccounts };
    });
  };

  const addAccount = (account: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...account,
      id: Date.now().toString(),
    };
    setState((prevState) => ({
      ...prevState,
      accounts: [...prevState.accounts, newAccount],
    }));
  };

  const updateAccount = (updatedAccount: Account) => {
    setState((prevState) => ({
      ...prevState,
      accounts: prevState.accounts.map((account) =>
        account.id === updatedAccount.id ? updatedAccount : account
      ),
    }));
  };

  const deleteAccount = (id: string) => {
    setState((prevState) => ({
      ...prevState,
      accounts: prevState.accounts.filter((account) => account.id !== id),
      movements: prevState.movements.filter(
        (movement) => movement.sourceAccountId !== id && movement.targetAccountId !== id
      ),
    }));
  };

  const deleteMovement = (id: string) => {
    setState((prevState) => {
      const movementToDelete = prevState.movements.find(m => m.id === id);
      if (!movementToDelete) return prevState;

      return {
        ...prevState,
        movements: prevState.movements.filter((m) => m.id !== id),
      };
    });
  };

  const getAvailableARS = (): number => {
    return state.accounts
      .filter(account => account.currency === 'ARS' && (account.categoryId === 'Uso Diario' || account.categoryId === 'Efectivo'))
      .reduce((total, account) => total + getAccountBalance(account.id), 0);
  };

  const getTotalARSInvestments = (): number => {
    return state.accounts
      .filter(account => account.currency === 'ARS' && account.categoryId === 'Inversiones')
      .reduce((total, account) => total + getAccountBalance(account.id), 0);
  };

  const store = {
    ...state,
    addMovement,
    deleteMovement,
    getBalance,
    getAccountBalance,
    getBalancesByGroup,
    getBalancesByCategory,
    addAccount,
    updateAccount,
    deleteAccount,
    addAccountGroup: (group: string) => addListItem('accountGroups', group),
    updateAccountGroup: (oldName: string, newName: string) => updateListItem('accountGroups', oldName, newName),
    deleteAccountGroup: (group: string) => deleteListItem('accountGroups', group),
    addAccountCategory: (category: string) => addListItem('accountCategories', category),
    updateAccountCategory: (oldName: string, newName: string) => updateListItem('accountCategories', oldName, newName),
    deleteAccountCategory: (category: string) => deleteListItem('accountCategories', category),
    getAvailableARS,
    getTotalARSInvestments,
  };

  return <FinanzasContext.Provider value={store}>{children}</FinanzasContext.Provider>;
};

export const useFinanzasStore = () => {
  const context = useContext(FinanzasContext);
  if (context === undefined) {
    throw new Error('useFinanzasStore must be used within a FinanzasProvider');
  }
  return context;
};
