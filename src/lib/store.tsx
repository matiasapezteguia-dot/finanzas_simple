import { create } from 'zustand';
import { supabase } from './supabaseClient';
import { Account, Movement, StoreState } from '../types/finanzas';

const initialState: StoreState = {
  movements: [],
  accounts: [],
  accountGroups: ['Bancos', 'Efectivo', 'Brókers'],
  accountCategories: ['Uso Diario', 'Inversiones', 'Fondo de Reserva'],
};

interface ExtendedStore extends StoreState {
  fetchInitialData: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  addMovement: (movement: Omit<Movement, 'id'>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  getAccountBalance: (accountId: string) => number;
  getTotalARS: () => number;
  getAvailableARS: () => number;
  getTotalARSInvestments: () => number;
  getTotalUSD: () => number;
}

export const useFinanzasStore = create<ExtendedStore>((set, get) => ({
  ...initialState,

  fetchInitialData: async () => {
    try {
      // 1. Fetch Grupos y Categorías
      const { data: groupsData } = await supabase.from('account_groups').select('name');
      const { data: categoriesData } = await supabase.from('account_categories').select('name');

      if (groupsData && groupsData.length > 0) {
        set({ accountGroups: groupsData.map(g => g.name) });
      }
      if (categoriesData && categoriesData.length > 0) {
        set({ accountCategories: categoriesData.map(c => c.name) });
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
        .from('movements')
        .select('*')
        .order('movement_date', { ascending: false });

      if (!movError && dbMovements) {
        const adaptedMovements: Movement[] = dbMovements.map((mov: any) => ({
          id: mov.id,
          cuentaId: mov.account_id,
          tipo: mov.movement_type,
          categoria: mov.category_name || '',
          monto: Number(mov.amount) || 0,
          descripcion: mov.description || '',
          fecha: mov.movement_date
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
      const { data: group } = await supabase.from('account_groups').select('id').eq('name', nuevaCuenta.grupo).single();
      const { data: category } = await supabase.from('account_categories').select('id').eq('name', nuevaCuenta.categoria).single();

      if (group && category) {
        const { data: inserted, error } = await supabase
          .from('accounts')
          .insert([{
            name: nuevaCuenta.nombre,
            group_id: group.id,
            category_id: category.id,
            currency: nuevaCuenta.moneda,
            initial_amount: Number(nuevaCuenta.montoInicial),
            current_amount: Number(nuevaCuenta.montoInicial)
          }])
          .select()
          .single();

        if (!error && inserted) {
          const cuentaAdaptada: Account = {
            id: inserted.id,
            nombre: inserted.name,
            grupo: nuevaCuenta.grupo,
            categoria: nuevaCuenta.categoria,
            moneda: inserted.currency,
            montoInicial: Number(inserted.initial_amount)
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
      const { data: inserted, error } = await supabase
        .from('movements')
        .insert([{
          account_id: mov.cuentaId,
          movement_type: mov.tipo,
          amount: montoNumerico,
          description: mov.descripcion,
          movement_date: mov.fecha,
          category_name: mov.categoria
        }])
        .select()
        .single();

      if (!error && inserted) {
        const movAdaptado: Movement = {
          id: inserted.id,
          cuentaId: inserted.account_id,
          tipo: inserted.movement_type as any,
          categoria: inserted.category_name || '',
          monto: montoNumerico,
          descripcion: inserted.description || '',
          fecha: inserted.movement_date
        };
        set((state) => ({ movements: [movAdaptado, ...state.movements] }));
      }
    } catch (err) {
      console.error('Error al guardar movimiento:', err);
      // Fallback local optimista para que la app no muera en fallos de red
      const localMov: Movement = { id: crypto.randomUUID(), ...mov, monto: montoNumerico };
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

  getAccountBalance: (accountId) => {
    const cuenta = get().accounts.find((a) => a.id === accountId);
    if (!cuenta) return 0;
    
    const balance = get().movements
      .filter((m) => m.cuentaId === accountId)
      .reduce((acc, m) => {
        if (m.tipo === 'ingreso') return acc + m.monto;
        if (m.tipo === 'egreso') return acc - m.monto;
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
  }
}));