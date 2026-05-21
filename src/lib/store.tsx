import { create } from 'zustand';
import { supabase } from './supabaseClient';
import { Account, Movement, StoreState, AccountCategory } from '../types/finanzas';

const initialState: StoreState = {
  movements: [],
  accounts: [],
  accountGroups: ['Bancos', 'Efectivo', 'Brókers'],
  accountCategories: [],
  movementTypes: [],
};

interface ExtendedStore extends StoreState {
  fetchInitialData: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  addMovement: (movement: Omit<Movement, 'id' | 'movement_type_code'>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  getAccountBalance: (accountId: string) => number;
  getTotalARS: () => number;
  getAvailableARS: () => number;
  getTotalARSInvestments: () => number;
  getTotalUSD: () => number;
  addAccountGroup: (name: string) => Promise<void>;
  updateAccountGroup: (oldName: string, newName: string) => Promise<void>;
  deleteAccountGroup: (name: string) => Promise<void>;
  addAccountCategory: (name: string) => Promise<void>;
  updateAccountCategory: (oldName: string, newName: string) => Promise<void>;
  deleteAccountCategory: (name: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
}

export const useFinanzasStore = create<ExtendedStore>((set, get) => ({
  ...initialState,

  fetchInitialData: async () => {
    try {
      // 1. Fetch Grupos, Categorías y Tipos
      const { data: groupsData } = await supabase.from('account_groups').select('name');
      const { data: categoriesData } = await supabase.from('account_categories').select('id, name');
      const { data: movementTypesData, error: movementTypesError } = await supabase.from('movement_types').select('id, name, code');

      if (groupsData && groupsData.length > 0) {
        set({ accountGroups: groupsData.map(g => g.name) });
      }
      if (categoriesData && categoriesData.length > 0) {
        set({ accountCategories: categoriesData as AccountCategory[] });
      }
      if (!movementTypesError && movementTypesData) {
        set({ movementTypes: movementTypesData });
      }

      // 2. Fetch Cuentas con Adaptador
      const { data: dbAccounts, error: accError } = await supabase
        .from('accounts')
        .select(`
          id, name, currency, initial_amount, current_amount,
          account_groups ( name ),
          account_categories ( name )
        `);

      if (!accError && dbAccounts) {
        const adaptedAccounts: Account[] = dbAccounts.map((acc: any) => ({
          id: acc.id,
          nombre: acc.name,
          grupo: acc.account_groups?.name || 'Bancos',
          categoria: acc.account_categories?.name || 'Uso Diario',
          moneda: acc.currency,
          montoInicial: Number(acc.initial_amount) || 0
        }));
        set({ accounts: adaptedAccounts });
      }

      // 3. Fetch Movimientos con Adaptador Unificado Relacional
      const { data: dbMovements, error: movError } = await supabase
        .from('transactions')
        .select(`
          id, account_id, movement_type_id, category_id, amount, description, transaction_date, related_transaction_id, currency, exchange_rate,
          movement_types ( code )
        `)
        .order('transaction_date', { ascending: false });

      if (!movError && dbMovements) {
        const adaptedMovements: Movement[] = dbMovements.map((mov: any) => ({
          id: mov.id,
          cuentaId: mov.account_id,
          movement_type_id: mov.movement_type_id,
          movement_type_code: mov.movement_types?.code || '',
          categoria: mov.category_id || '',
          monto: Number(mov.amount) || 0, // En la BD relacional el monto ya guarda su signo real (+ o -)
          descripcion: mov.description || '',
          fecha: mov.transaction_date,
          moneda: mov.currency,
        }));
        set({ movements: adaptedMovements });
      }
    } catch (err) {
      console.error('Error cargando datos de Supabase, usando fallbacks:', err);
    }
  },

  addAccount: async (nuevaCuenta) => {
    try {
      const { data: groupData, error: groupError } = await supabase.from('account_groups').select('id').eq('name', nuevaCuenta.grupo);
      const { data: categoryData, error: categoryError } = await supabase.from('account_categories').select('id').eq('name', nuevaCuenta.categoria);

      if (groupError || categoryError) return;

      const group = groupData && groupData.length > 0 ? groupData[0] : null;
      const category = categoryData && categoryData.length > 0 ? categoryData[0] : null;

      if (group && category) {
        const payload = {
          name: nuevaCuenta.nombre,
          account_group_id: group.id,
          account_category_id: category.id,
          currency: nuevaCuenta.moneda,
          initial_amount: Number(nuevaCuenta.montoInicial),
          current_amount: Number(nuevaCuenta.montoInicial),
        };

        const { data, error } = await supabase.from('accounts').insert([payload]).select();
        if (error) throw error;

        const newAccount = data && data.length > 0 ? data[0] : null;
        if (newAccount) {
          const cuentaAdaptada: Account = {
            id: newAccount.id,
            nombre: newAccount.name,
            grupo: nuevaCuenta.grupo,
            categoria: nuevaCuenta.categoria,
            moneda: newAccount.currency,
            montoInicial: Number(newAccount.initial_amount),
          };
          set((state) => ({ accounts: [...state.accounts, cuentaAdaptada] }));
        }
      }
    } catch (err) {
      console.error('Error al agregar cuenta:', err);
    }
  },

  addMovement: async (mov) => {
    const montoNumerico = Number(mov.monto) || 0;
    const movementTypes = get().movementTypes;
    const currentMovementType = movementTypes.find(type => type.id === mov.movement_type_id);
    const movementTypeCode = currentMovementType?.code;

    const isUUID = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

    let categoryIdToInsert: string | null = null;
    if (mov.categoria) {
      if (isUUID(mov.categoria)) {
        categoryIdToInsert = mov.categoria;
      } else {
        const accountCategories = get().accountCategories;
        const category = accountCategories.find(cat => cat.name === mov.categoria);
        if (category) {
          categoryIdToInsert = category.id;
        }
      }
    }

    try {
      if (movementTypeCode === 'transfer') {
        const egressPayload = {
          account_id: mov.cuentaId,
          movement_type_id: mov.movement_type_id,
          amount: -montoNumerico,
          description: mov.descripcion,
          transaction_date: mov.fecha,
          category_id: categoryIdToInsert,
          currency: mov.moneda,
          related_transaction_id: null,
        };

        const { data: egressData, error: egressError } = await supabase
          .from('transactions')
          .insert([egressPayload])
          .select('id');

        if (egressError) throw egressError;
        const insertedEgress = egressData && egressData.length > 0 ? egressData[0] : null;

        if (!insertedEgress) throw new Error('No se pudo insertar el movimiento de egreso.');

        const ingressPayload = {
          account_id: mov.targetAccountId,
          movement_type_id: mov.movement_type_id,
          amount: montoNumerico,
          description: mov.descripcion,
          transaction_date: mov.fecha,
          category_id: categoryIdToInsert,
          currency: mov.moneda,
          related_transaction_id: insertedEgress.id,
        };

        const { data: ingressData, error: ingressError } = await supabase
          .from('transactions')
          .insert([ingressPayload])
          .select('id');

        if (ingressError) throw ingressError;
        const insertedIngress = ingressData && ingressData.length > 0 ? ingressData[0] : null;

        if (!insertedIngress) throw new Error('No se pudo insertar el movimiento de ingreso.');

        await supabase
          .from('transactions')
          .update({ related_transaction_id: insertedIngress.id })
          .eq('id', insertedEgress.id);

        get().fetchInitialData();

      } else {
        let amountToInsert = montoNumerico;
        // Si es gasto o egreso, la base de datos almacena el valor en negativo para la doble entrada
        if (movementTypeCode === 'expense') {
          amountToInsert = -montoNumerico;
        }

        const payload = {
          account_id: mov.cuentaId,
          movement_type_id: mov.movement_type_id,
          category_id: categoryIdToInsert,
          amount: amountToInsert,
          description: mov.descripcion,
          transaction_date: mov.fecha,
          currency: mov.moneda,
        };

        const { error } = await supabase.from('transactions').insert([payload]);
        if (error) throw error;

        get().fetchInitialData();
      }
    } catch (err) {
      console.error('Error al agregar movimiento:', err);
      const localMov: Movement = { id: crypto.randomUUID(), ...mov, monto: montoNumerico, moneda: mov.moneda };
      set((state) => ({ movements: [localMov, ...state.movements] }));
    }
  },

  deleteMovement: async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) {
        set((state) => ({ movements: state.movements.filter((m) => m.id !== id) }));
      }
    } catch (err) {
      console.error(err);
    }
  },

  addAccountGroup: async (name: string) => {
    try {
      const { error } = await supabase.from('account_groups').insert([{ name }]);
      if (!error) get().fetchInitialData();
    } catch (error) {
      console.error('Error al agregar grupo de cuenta:', error);
    }
  },

  updateAccountGroup: async (oldName: string, newName: string) => {
    try {
      const { error } = await supabase.from('account_groups').update({ name: newName }).eq('name', oldName);
      if (!error) get().fetchInitialData();
    } catch (error) {
      console.error('Error al actualizar grupo de cuenta:', error);
    }
  },

  deleteAccountGroup: async (name: string) => {
    try {
      const { error } = await supabase.from('account_groups').delete().eq('name', name);
      if (!error) get().fetchInitialData();
    } catch (error) {
      console.error('Error al eliminar grupo de cuenta:', error);
    }
  },

  addAccountCategory: async (name: string) => {
    try {
      const { error } = await supabase.from('account_categories').insert([{ name }]);
      if (!error) get().fetchInitialData();
    } catch (error) {
      console.error('Error al agregar categoría de cuenta:', error);
    }
  },

  updateAccountCategory: async (oldName: string, newName: string) => {
    try {
      const { error } = await supabase.from('account_categories').update({ name: newName }).eq('name', oldName);
      if (!error) get().fetchInitialData();
    } catch (error) {
      console.error('Error al actualizar categoría de cuenta:', error);
    }
  },

  deleteAccountCategory: async (name: string) => {
    try {
      const { error } = await supabase.from('account_categories').delete().eq('name', name);
      if (!error) get().fetchInitialData();
    } catch (error) {
      console.error('Error al eliminar categoría de cuenta:', error);
    }
  },

  // MATEMÁTICA CON NORMALIZACIÓN INTELIGENTE (Bilingüe e inmune a fallos)
  getAccountBalance: (accountId) => {
    const cuenta = get().accounts.find((a) => a.id === accountId);
    if (!cuenta) return 0;
    
    const balance = get().movements
      .filter((m) => m.cuentaId === accountId)
      .reduce((acc, m) => {
        // En base de datos relacional pura el monto viene directo firmado (+ o -)
        // Pero controlamos fallbacks por si coincide con códigos de texto viejos o nuevos
        const type = m.movement_type_code?.toLowerCase().trim();
        
        if (type === 'income' || type === 'ingreso') {
          return acc + Math.abs(m.monto);
        } else if (type === 'expense' || type === 'egreso') {
          return acc - Math.abs(m.monto);
        } else {
          // Para transferencias o ajustes, usamos directamente el valor firmado neto que inyectó la BD
          return acc + m.monto;
        }
      }, cuenta.montoInicial);

    return isNaN(balance) ? 0 : balance;
  },

  getTotalARS: () => {
    const total = get().accounts
      .filter((a) => a.moneda === 'ARS')
      .reduce((acc, a) => acc + get().getAccountBalance(a.id), 0);
    return isNaN(total) ? 0 : total;
  },

  getAvailableARS: () => {
    const total = get().accounts
      .filter((a) => a.moneda === 'ARS' && a.categoria !== 'Inversiones')
      .reduce((acc, a) => acc + get().getAccountBalance(a.id), 0);
    return isNaN(total) ? 0 : total;
  },

  getTotalARSInvestments: () => {
    const total = get().accounts
      .filter((a) => a.moneda === 'ARS' && a.categoria === 'Inversiones')
      .reduce((acc, a) => acc + get().getAccountBalance(a.id), 0);
    return isNaN(total) ? 0 : total;
  },

  getTotalUSD: () => {
    const total = get().accounts
      .filter((a) => a.moneda === 'USD')
      .reduce((acc, a) => acc + get().getAccountBalance(a.id), 0);
    return isNaN(total) ? 0 : total;
  },

  updateAccount: async (updatedAccount: Account) => {
    try {
      const { data: groupData, error: groupError } = await supabase.from('account_groups').select('id').eq('name', updatedAccount.grupo);
      const { data: categoryData, error: categoryError } = await supabase.from('account_categories').select('id').eq('name', updatedAccount.categoria);

      if (groupError || categoryError) return;

      const group = groupData && groupData.length > 0 ? groupData[0] : null;
      const category = categoryData && categoryData.length > 0 ? categoryData[0] : null;

      if (group && category) {
        const updatePayload = {
          name: updatedAccount.nombre,
          account_group_id: group.id,
          account_category_id: category.id,
          currency: updatedAccount.moneda,
          initial_amount: updatedAccount.montoInicial,
        };

        const { error } = await supabase.from('accounts').update(updatePayload).eq('id', updatedAccount.id);

        if (!error) {
          set((state) => ({
            accounts: state.accounts.map((account) =>
              account.id === updatedAccount.id ? updatedAccount : account
            ),
          }));
        }
      }
    } catch (err) {
      console.error('Error al actualizar cuenta:', err);
    }
  },

  deleteAccount: async (id: string) => {
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (!error) {
        set((state) => ({
          accounts: state.accounts.filter((account) => account.id !== id),
        }));
      }
    } catch (err) {
      console.error('Error al eliminar cuenta:', err);
    }
  }
}));