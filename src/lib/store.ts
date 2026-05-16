import { useState, useEffect } from 'react';

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
  type: 'income' | 'expense' | 'transfer';
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

const LOCAL_STORAGE_KEY = 'finanzasStore';

const initialState: StoreState = {
  movements: [],
  accounts: [],
  accountGroups: ['Banco', 'Cheque', 'Efectivo'],
  accountCategories: ['Inversiones', 'Uso Diario', 'Cripto'],
};

const loadState = (): StoreState => {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return initialState;
    }
    const storedState: StoreState = JSON.parse(serializedState);
    return {
      ...initialState, // Merge with initial state to ensure new properties are present
      ...storedState,
      accounts: storedState.accounts || initialState.accounts,
      accountGroups: storedState.accountGroups || initialState.accountGroups,
      accountCategories: storedState.accountCategories || initialState.accountCategories,
    };
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
    return initialState;
  }
};

const saveState = (state: StoreState) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
  } catch (error) {
    console.error("Error saving state to localStorage:", error);
  }
};

export const useFinanzasStore = () => {
  const [state, setState] = useState<StoreState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addMovement = (movement: Omit<Movement, 'id'>) => {
    const newMovement: Movement = {
      ...movement,
      id: Date.now().toString(), // Simple unique ID
    };
    setState((prevState) => {
      const newState = { ...prevState, movements: [...prevState.movements, newMovement] };
      // Actualizar el balance de la cuenta afectada
      if (newMovement.sourceAccountId) {
        const sourceAccount = prevState.accounts.find(acc => acc.id === newMovement.sourceAccountId);
        if (sourceAccount) {
          // No se actualiza el initialAmount, se actualiza el balance a través de los movimientos
        }
      }
      if (newMovement.targetAccountId) {
        const targetAccount = prevState.accounts.find(acc => acc.id === newMovement.targetAccountId);
        if (targetAccount) {
          // No se actualiza el initialAmount, se actualiza el balance a través de los movimientos
        }
      }
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

    state.movements.forEach(m => {
      if (m.targetAccountId === accountId) {
        balance += m.amount;
      } else if (m.sourceAccountId === accountId) {
        balance -= m.amount;
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

      // Also update accounts that might be using this old item
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

      // No es necesario revertir el impacto en la cuenta
      // ya que getBalance y getAccountBalance calculan dinámicamente
      // el balance basándose en todos los movimientos existentes.
      // Al eliminar el movimiento, el recálculo automático se encargará.

      return {
        ...prevState,
        movements: prevState.movements.filter((m) => m.id !== id),
      };
    });
  };

    return {
      movements: state.movements,
      accounts: state.accounts,
      accountGroups: state.accountGroups,
      accountCategories: state.accountCategories,
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
    };
  };
