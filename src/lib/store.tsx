import { create } from 'zustand';
import { supabase } from './supabaseClient';
import { Account, Movement, StoreState } from '../types/finanzas';

const initialState: StoreState = {
  movements: [],
  accounts: [],
  accountGroups: ['Bancos', 'Efectivo', 'Brókers'],
  accountCategories: ['Uso Diario', 'Inversiones', 'Fondo de Reserva'],
  movementTypes: [], // New: Initialize movementTypes
};

  interface ExtendedStore extends StoreState {
    fetchInitialData: () => Promise<void>;
    addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
    addMovement: (movement: Omit<Movement, 'id' | 'movement_type_code'>) => Promise<void>; // Updated Omit
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
    deleteAccount: (id: string) => Promise<void>; // Added deleteAccount
    updateAccount: (account: Account) => Promise<void>;
  }

  export const useFinanzasStore = create<ExtendedStore>((set, get) => ({
    ...initialState,

    fetchInitialData: async () => {
      try {
        // 1. Fetch Grupos y Categorías
        const { data: groupsData } = await supabase.from('account_groups').select('name');
        const { data: categoriesData } = await supabase.from('account_categories').select('name');
        const { data: movementTypesData, error: movementTypesError } = await supabase.from('movement_types').select('id, name, code');

        if (groupsData && groupsData.length > 0) {
          set({ accountGroups: groupsData.map(g => g.name) });
        }
        if (categoriesData && categoriesData.length > 0) {
          set({ accountCategories: categoriesData.map(c => c.name) });
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

        // 3. Fetch Movimientos con Adaptador
        const { data: dbMovements, error: movError } = await supabase
          .from('transactions') // Changed from 'movements' to 'transactions'
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
            monto: Number(mov.amount) || 0,
            descripcion: mov.description || '',
            fecha: mov.transaction_date,
            moneda: mov.currency,
            // sourceAccountId, targetAccountId, relatedTransactionId will be handled if needed
          }));
          set({ movements: adaptedMovements });
        }
      } catch (err) {
        console.error('Error cargando datos de Supabase, usando fallbacks:', err);
      }
    },

    addAccount: async (nuevaCuenta) => {
      try {
        // Buscar UUIDs en Supabase correspondientes a los nombres en español
        const { data: groupData, error: groupError } = await supabase.from('account_groups').select('id').eq('name', nuevaCuenta.grupo);
        const { data: categoryData, error: categoryError } = await supabase.from('account_categories').select('id').eq('name', nuevaCuenta.categoria);

        if (groupError) {
          console.error('Error al buscar grupo de cuenta:', groupError);
          return;
        }
        if (categoryError) {
          console.error('Error al buscar categoría de cuenta:', categoryError);
          return;
        }

        const group = groupData && groupData.length > 0 ? groupData[0] : null;
        const category = categoryData && categoryData.length > 0 ? categoryData[0] : null;

        if (!group) {
          console.error('Grupo de cuenta no encontrado:', nuevaCuenta.grupo);
          return;
        }
        if (!category) {
          console.error('Categoría de cuenta no encontrada:', nuevaCuenta.categoria);
          return;
        }

        // Si ambos existen, procedemos con la inserción
        if (group && category) {
          const payload = {
            name: nuevaCuenta.nombre,
            account_group_id: group.id,
            account_category_id: category.id,
            currency: nuevaCuenta.moneda,
            initial_amount: Number(nuevaCuenta.montoInicial),
            current_amount: Number(nuevaCuenta.montoInicial),
          };

          const { data, error } = await supabase
            .from('accounts')
            .insert([payload])
            .select();

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
      try {
        // Check if it's a transfer
        if (mov.sourceAccountId && mov.targetAccountId) {
          // Movement from source account (egress)
          const egressPayload = {
            account_id: mov.sourceAccountId,
            movement_type_id: mov.movement_type_id, // Assuming a transfer type or egress type
            amount: -montoNumerico, // Negative for egress
            description: `Transferencia a ${mov.targetAccountId}: ${mov.descripcion}`,
            transaction_date: mov.fecha,
            category_id: mov.categoria, // Or a specific transfer category
            currency: mov.moneda,
            related_transaction_id: null, // Will be updated after both inserts
          };

          // Movement to target account (ingress)
          const ingressPayload = {
            account_id: mov.targetAccountId,
            movement_type_id: mov.movement_type_id, // Assuming a transfer type or ingress type
            amount: montoNumerico, // Positive for ingress
            description: `Transferencia desde ${mov.sourceAccountId}: ${mov.descripcion}`,
            transaction_date: mov.fecha,
            category_id: mov.categoria, // Or a specific transfer category
            currency: mov.moneda,
            related_transaction_id: null, // Will be updated after both inserts
          };

          const { data, error } = await supabase
            .from('transactions')
            .insert([egressPayload, ingressPayload])
            .select(`
              id, account_id, movement_type_id, category_id, amount, description, transaction_date, related_transaction_id, currency, exchange_rate,
              source_account_id, target_account_id,
              movement_types ( code )
            `);

          if (error) throw error;

          if (data && data.length === 2) {
            const [insertedEgress, insertedIngress] = data;

            // Update related_transaction_id for both movements
            await supabase
              .from('transactions')
              .update({ related_transaction_id: insertedIngress.id })
              .eq('id', insertedEgress.id);
            await supabase
              .from('transactions')
              .update({ related_transaction_id: insertedEgress.id })
              .eq('id', insertedIngress.id);

            const adaptedMovements: Movement[] = data.map((insertedMov: any) => ({
              id: insertedMov.id,
              cuentaId: insertedMov.account_id,
              movement_type_id: insertedMov.movement_type_id,
              movement_type_code: (insertedMov.movement_types as { code: string }[])[0]?.code || '',
              categoria: insertedMov.category_id || '',
              monto: Number(insertedMov.amount),
              descripcion: insertedMov.description || '',
              fecha: insertedMov.transaction_date,
              moneda: insertedMov.currency,
              sourceAccountId: insertedMov.source_account_id || undefined,
              targetAccountId: insertedMov.target_account_id || undefined,
            }));
            set((state) => ({ movements: [...adaptedMovements, ...state.movements] }));
          }
        } else {
          // Existing single movement logic
          const payload: any = {
            account_id: mov.cuentaId,
            movement_type_id: mov.movement_type_id,
            amount: montoNumerico,
            description: mov.descripcion,
            transaction_date: mov.fecha,
            category_id: mov.categoria,
            currency: mov.moneda,
          };

          const { data, error } = await supabase
            .from('transactions')
            .insert([payload])
            .select(`
              id, account_id, movement_type_id, category_id, amount, description, transaction_date, related_transaction_id, currency, exchange_rate,
              source_account_id, target_account_id,
              movement_types ( code )
            `);

          if (error) throw error;

          const insertedMovement = data && data.length > 0 ? data[0] : null;

          if (insertedMovement) {
            const movAdaptado: Movement = {
              id: insertedMovement.id,
              cuentaId: insertedMovement.account_id,
              movement_type_id: insertedMovement.movement_type_id,
              movement_type_code: (insertedMovement.movement_types as { code: string }[])[0]?.code || '',
              categoria: insertedMovement.category_id || '',
              monto: Number(insertedMovement.amount),
              descripcion: insertedMovement.description || '',
              fecha: insertedMovement.transaction_date,
              moneda: insertedMovement.currency,
              sourceAccountId: insertedMovement.source_account_id || undefined,
              targetAccountId: insertedMovement.target_account_id || undefined,
            };
            set((state) => ({ movements: [movAdaptado, ...state.movements] }));
          }
        }
      } catch (err) {
        console.error('Error al guardar movimiento:', err);
        // Fallback local optimista para que la app no muera en fallos de red
        const localMov: Movement = { id: crypto.randomUUID(), ...mov, monto: montoNumerico, moneda: mov.moneda };
        set((state) => ({ movements: [localMov, ...state.movements] }));
      }
    },

    deleteMovement: async (id) => {
      try {
        const { error } = await supabase.from('movements').delete().eq('id', id);
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
        if (!error) {
          get().fetchInitialData(); // Refrescar datos para actualizar la UI
        }
      } catch (error) {
        console.error('Error al agregar grupo de cuenta:', error);
      }
    },

    updateAccountGroup: async (oldName: string, newName: string) => {
      try {
        const { error } = await supabase.from('account_groups').update({ name: newName }).eq('name', oldName);
        if (!error) {
          get().fetchInitialData();
        }
      } catch (error) {
        console.error('Error al actualizar grupo de cuenta:', error);
      }
    },

    deleteAccountGroup: async (name: string) => {
      try {
        const { error } = await supabase.from('account_groups').delete().eq('name', name);
        if (!error) {
          get().fetchInitialData();
        }
      } catch (error) {
        console.error('Error al eliminar grupo de cuenta:', error);
      }
    },

    addAccountCategory: async (name: string) => {
      try {
        const { error } = await supabase.from('account_categories').insert([{ name }]);
        if (!error) {
          get().fetchInitialData();
        }
      } catch (error) {
        console.error('Error al agregar categoría de cuenta:', error);
      }
    },

    updateAccountCategory: async (oldName: string, newName: string) => {
      try {
        const { error } = await supabase.from('account_categories').update({ name: newName }).eq('name', oldName);
        if (!error) {
          get().fetchInitialData();
        }
      } catch (error) {
        console.error('Error al actualizar categoría de cuenta:', error);
      }
    },

    deleteAccountCategory: async (name: string) => {
      try {
        const { error } = await supabase.from('account_categories').delete().eq('name', name);
        if (!error) {
          get().fetchInitialData();
        }
      } catch (error) {
        console.error('Error al eliminar categoría de cuenta:', error);
      }
    },

    getAccountBalance: (accountId) => {
      const cuenta = get().accounts.find((a) => a.id === accountId);
      if (!cuenta) return 0;
      
      const balance = get().movements
        .filter((m) => m.cuentaId === accountId)
        .reduce((acc, m) => {
          if (m.movement_type_code === 'ingreso') return acc + m.monto;
          if (m.movement_type_code === 'egreso') return acc - m.monto;
          return acc; 
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
        // Obtener los IDs de grupo y categoría basados en los nombres
        const { data: groupData, error: groupError } = await supabase
          .from('account_groups')
          .select('id')
          .eq('name', updatedAccount.grupo);
        
        const { data: categoryData, error: categoryError } = await supabase
          .from('account_categories')
          .select('id')
          .eq('name', updatedAccount.categoria);

        if (groupError) {
          console.error('Error al buscar grupo de cuenta para actualizar:', groupError);
          return;
        }
        if (categoryError) {
          console.error('Error al buscar categoría de cuenta para actualizar:', categoryError);
          return;
        }

        const group = groupData && groupData.length > 0 ? groupData[0] : null;
        const category = categoryData && categoryData.length > 0 ? categoryData[0] : null;

        if (!group) {
          console.error('Grupo de cuenta no encontrado para actualizar:', updatedAccount.grupo);
          return;
        }
        if (!category) {
          console.error('Categoría de cuenta no encontrada para actualizar:', updatedAccount.categoria);
          return;
        }

        const group_id = group.id;
        const category_id = category.id;

        const updatePayload = {
          name: updatedAccount.nombre,
          account_group_id: group_id,
          account_category_id: category_id,
          currency: updatedAccount.moneda,
          initial_amount: updatedAccount.montoInicial,
          // current_amount no se actualiza directamente aquí, se calcula a partir de movimientos
        };

        const { error } = await supabase
          .from('accounts')
          .update(updatePayload)
          .eq('id', updatedAccount.id);

        if (!error) {
          set((state) => ({
            accounts: state.accounts.map((account) =>
              account.id === updatedAccount.id ? updatedAccount : account
            ),
          }));
        } else {
          console.error('Error al actualizar cuenta en Supabase:', error);
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
        } else {
          console.error('Error al eliminar cuenta en Supabase:', error);
        }
      } catch (err) {
        console.error('Error al eliminar cuenta:', err);
      }
    }
  }));
