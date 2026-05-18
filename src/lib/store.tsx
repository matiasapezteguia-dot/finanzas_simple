import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Account, Movement, StoreState, FinanzasStoreContextType, MonedaType } from '../types/finanzas';

const LOCAL_STORAGE_KEY = 'finanzasStore';

// Helper function to get account group ID by name
const getAccountGroupIdByName = async (name: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('account_groups')
    .select('id')
    .eq('name', name)
    .single();
  if (error) {
    console.error('Error fetching account group ID:', error);
    return null;
  }
  return data?.id || null;
};

// Helper function to get account category ID by name
const getAccountCategoryIdByName = async (name: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('account_categories')
    .select('id')
    .eq('name', name)
    .single();
  if (error) {
    console.error('Error fetching account category ID:', error);
    return null;
  }
  return data?.id || null;
};

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

  useEffect(() => {
    const fetchInitialData = async () => {
      let fetchedAccountGroups: string[] = initialState.accountGroups;
      let fetchedAccountCategories: string[] = initialState.accountCategories;

      try {
        const { data: groupsData, error: groupsError } = await supabase
          .from('account_groups')
          .select('name');
        if (groupsError) {
          console.error('Error fetching account groups:', groupsError);
        } else if (groupsData) {
          fetchedAccountGroups = groupsData.map((g: { name: string }) => g.name);
        }

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('account_categories')
          .select('name');
        if (categoriesError) {
          console.error('Error fetching account categories:', categoriesError);
        } else if (categoriesData) {
          fetchedAccountCategories = categoriesData.map((c: { name: string }) => c.name);
        }
      } catch (error) {
        console.error('Network or unexpected error fetching initial data:', error);
        // Fallback to initial state values already set
      } finally {
        setState((prevState) => ({
          ...prevState,
          accountGroups: fetchedAccountGroups,
          accountCategories: fetchedAccountCategories,
        }));
      }

      const { data, error } = await supabase.from('movements').select('*');
      if (error) {
        console.error('Error fetching movements:', error);
      } else if (data) {
        const mappedMovements: Movement[] = data.map((m: any) => ({
          id: m.id,
          cuentaId: m.account_id,
          tipo: m.movement_type,
          category_name: m.category_name,
          monto: m.amount,
          description: m.description,
          fecha: m.movement_date,
          currency: m.currency,
          sourceAccountId: m.source_account_id,
          targetAccountId: m.target_account_id,
          created_at: m.created_at,
        }));
        setState((prevState) => ({ ...prevState, movements: mappedMovements }));
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array means this effect runs once on mount

  const addMovement = async (movement: Omit<Movement, 'id' | 'created_at'>) => {
    const newMovement: Movement = {
      ...movement,
      monto: Number(movement.monto), // Ensure monto is a number
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    setState((prevState) => {
      const newState = { ...prevState, movements: [...prevState.movements, newMovement] };
      return newState;
    });

    // Insert into Supabase
    try {
      const { error } = await supabase.from('movements').insert([
        {
          id: newMovement.id,
          account_id: newMovement.cuentaId,
          movement_type: newMovement.tipo,
          amount: newMovement.monto, // Already converted to number above
          description: newMovement.description,
          movement_date: newMovement.fecha,
          category_name: newMovement.category_name, // Mapped from 'categoria'
          currency: newMovement.currency,
          source_account_id: newMovement.sourceAccountId,
          target_account_id: newMovement.targetAccountId,
          created_at: newMovement.created_at,
        },
      ]);

      if (error) {
        console.error('Error inserting movement into Supabase:', error);
      }
    } catch (error) {
      console.error('Network or unexpected error inserting movement into Supabase:', error);
    }
  };

  const getBalance = (currency: MonedaType): number => {
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
        if (m.tipo === 'adjustment') {
          if (m.targetAccountId === accountId) {
            balance += m.monto;
          }
        } else { // For 'income', 'expense', 'transfer'
          if (m.targetAccountId === accountId) {
            balance += m.monto;
          }
          if (m.sourceAccountId === accountId) {
            balance -= m.monto;
          }
        }
      });
    return balance;
  };

  const getBalancesByGroup = (currency: MonedaType) => {
    const balances: { [key: string]: number } = {};
    state.accountGroups.forEach(group => {
      balances[group] = 0;
    });

    state.accounts
      .filter(account => account.currency === currency)
      .forEach(account => {
        const currentBalance = getAccountBalance(account.id);
        if (account.groupId) {
          balances[account.groupId] += currentBalance;
        }
      });
    return balances;
  };

  const getBalancesByCategory = (currency: MonedaType) => {
    const balances: { [key: string]: number } = {};
    state.accountCategories.forEach(category => {
      balances[category] = 0;
    });

    state.accounts
      .filter(account => account.currency === currency)
      .forEach(account => {
        const currentBalance = getAccountBalance(account.id);
        if (account.categoryId) {
          balances[account.categoryId] += currentBalance;
        }
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

  const addAccount = async (account: Omit<Account, 'id' | 'created_at' | 'currentAmount'>) => {
    // Fetch group_id and category_id from Supabase
    const groupId = account.groupId ? await getAccountGroupIdByName(account.groupId) : null;
    const categoryId = account.categoryId ? await getAccountCategoryIdByName(account.categoryId) : null;

    const newAccountForSupabase = {
      name: account.name,
      group_id: groupId,
      category_id: categoryId,
      currency: account.currency,
      initial_amount: Number(account.initialAmount),
      current_amount: Number(account.initialAmount),
    };

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([newAccountForSupabase])
        .select()
        .single();

      if (error) {
        console.error('Error inserting account into Supabase:', error);
        return;
      }

      if (data) {
        const newAccount: Account = {
          id: data.id,
          name: data.name,
          groupId: data.group_id,
          categoryId: data.category_id,
          currency: data.currency,
          initialAmount: data.initial_amount,
          currentAmount: data.current_amount,
          created_at: data.created_at,
        };

        setState((prevState) => ({
          ...prevState,
          accounts: [...prevState.accounts, newAccount],
        }));
      }
    } catch (error) {
      console.error('Network or unexpected error inserting account into Supabase:', error);
    }
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
