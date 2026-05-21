import { create } from 'zustand';

import { Account, Movement, StoreState, AccountCategory, FinanzasStoreContextType, MonedaType } from '../types/finanzas';
import { supabaseTransactionRepository } from './repositories/SupabaseTransactionRepository';
import { supabaseAccountRepository } from './repositories/SupabaseAccountRepository';
import { supabaseCatalogRepository } from './repositories/SupabaseCatalogRepository';

const initialState: StoreState = {
  movements: [],
  accounts: [],
  accountGroups: ['Bancos', 'Efectivo', 'Brókers'],
  accountCategories: [],
  movementTypes: [],
};

export const useFinanzasStore = create<FinanzasStoreContextType>((set, get) => ({
  ...initialState,

  // 1. CARGA DE DATOS ORQUESTADA A TRAVÉS DE REPOSITORIOS
  fetchInitialData: async () => {
    try {
      // Catálogos auxiliares
      const [accountGroups, accountCategories, movementTypes, movements, accounts] = await Promise.all([
        supabaseCatalogRepository.fetchGroups(),
        supabaseCatalogRepository.fetchCategories(),
        supabaseCatalogRepository.fetchMovementTypes(),
        supabaseTransactionRepository.fetchAll(),
        supabaseAccountRepository.fetchAll()
      ]);

      set({
        accountGroups,
        accountCategories,
        movementTypes,
        movements,
        accounts
      });
    } catch (err) {
      console.error('Error en la orquestación de datos del Store:', err);
    }
  },

  // 2. OPERACIONES DE MOVIMIENTOS DESACOPLADAS
  addMovement: async (mov) => {
    try {
      await supabaseTransactionRepository.save(mov);
      await get().fetchInitialData(); // Sincroniza estado local automáticamente
    } catch (err) {
      console.error('Error al delegar inserción de movimiento:', err);
    }
  },

  deleteMovement: async (id) => {
    try {
      await supabaseTransactionRepository.delete(id);
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error al delegar eliminación de movimiento:', err);
    }
  },

  // 3. OPERACIONES DE CUENTAS DESACOPLADAS
  addAccount: async (nuevaCuenta) => {
    try {
      await supabaseAccountRepository.save(nuevaCuenta);
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error al delegar creación de cuenta:', err);
    }
  },

  updateAccount: async (cuentaModificada) => {
    try {
      await supabaseAccountRepository.update(cuentaModificada);
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error al delegar actualización de cuenta:', err);
    }
  },

  deleteAccount: async (id) => {
    try {
      await supabaseAccountRepository.delete(id);
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error al delegar eliminación de cuenta:', err);
    }
  },

  // 4. MANTENIMIENTO DE ESTRUCTURAS SECUNDARIAS
  addAccountGroup: async (name: string) => {
    try {
      await supabaseCatalogRepository.addGroup(name);
      await get().fetchInitialData();
    } catch (error) {
      console.error(error);
    }
  },

  updateAccountGroup: async (oldName: string, newName: string) => {
    try {
      await supabaseCatalogRepository.updateGroup(oldName, newName);
      await get().fetchInitialData();
    } catch (error) {
      console.error(error);
    }
  },

  deleteAccountGroup: async (name: string) => {
    try {
      await supabaseCatalogRepository.deleteGroup(name);
      await get().fetchInitialData();
    } catch (error) {
      console.error(error);
    }
  },

  addAccountCategory: async (name: string) => {
    try {
      await supabaseCatalogRepository.addCategory(name);
      await get().fetchInitialData();
    } catch (error) {
      console.error(error);
    }
  },

  updateAccountCategory: async (oldName: string, newName: string) => {
    try {
      await supabaseCatalogRepository.updateCategory(oldName, newName);
      await get().fetchInitialData();
    } catch (error) {
      console.error(error);
    }
  },

  deleteAccountCategory: async (name: string) => {
    try {
      await supabaseCatalogRepository.deleteCategory(name);
      await get().fetchInitialData();
    } catch (error) {
      console.error(error);
    }
  },

  // 5. INTELIGENCIA CONTABLE BILINGÜE INTEGRADORA (Inmune a fallos)
  getAccountBalance: (accountId) => {
    const cuenta = get().accounts.find((a) => a.id === accountId);
    if (!cuenta) return 0;
    
    const balance = get().movements
      .filter((m) => m.cuentaId === accountId)
      .reduce((acc, m) => {
        // 1. Buscar el tipo de movimiento en el catálogo usando el ID real de la base de datos
        const tipoEncontrado = get().movementTypes.find(
          (t) => t.id === m.movement_type_id || t.id === (m as any).typeId
        );
        
        // 2. Obtener el nombre o código para saber qué es
        const nombreTipo = tipoEncontrado?.name?.toLowerCase().trim() || '';
        const codigoTipo = tipoEncontrado?.code?.toLowerCase().trim() || '';
        
        const montoAbs = Math.abs(m.monto);

        // 3. Evaluar con precisión quirúrgica
        if (nombreTipo === 'ingreso' || codigoTipo === 'income') {
          return acc + montoAbs;
        } else if (nombreTipo === 'egreso' || codigoTipo === 'expense') {
          return acc - montoAbs;
        } else {
          // Salvavidas final por si el monto vino explícitamente negativo
          return m.monto < 0 ? acc - montoAbs : acc + m.monto;
        }
      }, cuenta.montoInicial);

    return isNaN(balance) ? 0 : balance;
  },

  getBalance: (currency: MonedaType) => {
    const total = get().accounts
      .filter((a) => a.moneda === currency)
      .reduce((acc, a) => acc + get().getAccountBalance(a.id), 0);
    return isNaN(total) ? 0 : total;
  },

  getTotalARS: () => get().getBalance('ARS'),
  getTotalUSD: () => get().getBalance('USD'),

  getAvailableARS: () => {
    const total = get().accounts
      .filter((a) => a.moneda === 'ARS' && a.categoria !== 'Inversiones' && a.categoria !== 'Inversión')
      .reduce((acc, a) => acc + get().getAccountBalance(a.id), 0);
    return isNaN(total) ? 0 : total;
  },

  getTotalARSInvestments: () => {
    const total = get().accounts
      .filter((a) => a.moneda === 'ARS' && (a.categoria === 'Inversiones' || a.categoria === 'Inversión'))
      .reduce((acc, a) => acc + get().getAccountBalance(a.id), 0);
    return isNaN(total) ? 0 : total;
  },

  getBalancesByGroup: (currency: MonedaType) => {
    const res: { [key: string]: number } = {};
    get().accounts
      .filter((a) => a.moneda === currency)
      .forEach((a) => {
        const grupo = a.grupo || 'Otros';
        res[grupo] = (res[grupo] || 0) + get().getAccountBalance(a.id);
      });
    return res;
  },

  getBalancesByCategory: (currency: MonedaType) => {
    const res: { [key: string]: number } = {};
    get().accounts
      .filter((a) => a.moneda === currency)
      .forEach((a) => {
        const cat = a.categoria || 'Sin Categoría';
        res[cat] = (res[cat] || 0) + get().getAccountBalance(a.id);
      });
    return res;
  }
}));