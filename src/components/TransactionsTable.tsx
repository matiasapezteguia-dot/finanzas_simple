import React, { useState } from 'react';
import { Account, Movement } from "../types/finanzas";
import { ArrowUpDown } from 'lucide-react';

interface TransactionsTableProps {
  movements: Movement[];
  accounts: Account[];
  deleteMovement: (id: string) => void;
  filterAccount: string;
  setFilterAccount: (account: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterStartDate: string;
  setFilterStartDate: (date: string) => void;
  filterEndDate: string;
  setFilterEndDate: (date: string) => void;
  filterType: "all" | "income" | "expense" | "transfer" | "adjustment";
  setFilterType: (type: "all" | "income" | "expense" | "transfer" | "adjustment") => void;
  filterGroup: string;
  setFilterGroup: (group: string) => void;
  handleClearFilters: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  movementsPerPage: number;
  accountCategories: any[]; // Cambiado a any[] para tolerar objetos de Supabase
  accountGroups: string[];
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  movements,
  accounts,
  deleteMovement,
  filterAccount,
  setFilterAccount,
  filterCategory,
  setFilterCategory,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  filterType,
  setFilterType,
  filterGroup,
  setFilterGroup,
  handleClearFilters,
  currentPage,
  setCurrentPage,
  movementsPerPage,
  accountCategories,
  accountGroups,
}) => {
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Helpers de conversión de fechas tolerantes al backend relacional de Supabase
  const createLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getLocalMidnight = (dateInput: any): Date => {
    if (!dateInput) return new Date();
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  // Mapeador Inteligente de Normalización de Movimientos
  const normalizedMovements = movements.map((m: any) => {
    // 1. Extraer Fecha Real
    const rawDate = m.transaction_date || m.date || m.fecha;
    
    // 2. Extraer Monto Real
    const rawAmount = m.amount ?? m.monto ?? 0;
    
    // 3. Extraer Moneda Real
    const rawCurrency = m.currency || m.moneda || 'ARS';

    // 4. Extraer Tipo de Movimiento y normalizarlo a código ('income', 'expense', etc.)
    let codeType = 'adjustment';
    let labelType = 'Ajuste';
    
    // Lista dura temporal para mappear UUIDs reales detectados en Navicat
    if (m.movement_type_id === '0dbd4608-5fdb-4b72-8ec6-3472933213b9' || m.type === 'income' || m.tipo === 'ingreso') {
      codeType = 'income';
      labelType = 'Ingreso';
    } else if (m.movement_type_id === 'ed5adc36-3663-41a0-91a4-677595113d98' || m.type === 'expense' || m.tipo === 'egreso') {
      codeType = 'expense';
      labelType = 'Egreso';
    } else if (m.movement_type_id === 'bcf8578e-a9fc-42df-8001-5451e0d654d2' || m.type === 'transfer' || m.tipo === 'transferencia') {
      codeType = 'transfer';
      labelType = 'Transferencia';
    } else if (m.movement_type_id === 'f4c0770f-0a55-4fbb-a8f6-0db4ef3fa5bb' || m.type === 'adjustment' || m.tipo === 'ajuste') {
      codeType = 'adjustment';
      labelType = 'Ajuste';
    }

    // 5. Intentar resolver las cuentas del sistema vinculadas (si aplican)
    const activeAccountId = m.account_id || m.cuentaId || m.sourceAccountId || m.targetAccountId;
    const systemAccount = accounts.find(acc => acc.id === activeAccountId);

    return {
      id: m.id,
      date: rawDate,
      description: m.description || m.descripcion || 'Sin descripción',
      amount: Number(rawAmount),
      currency: rawCurrency,
      typeCode: codeType,
      typeLabel: labelType,
      accountId: activeAccountId,
      accountName: systemAccount?.nombre || '',
      category: systemAccount?.categoria || m.categoria || '',
      group: systemAccount?.grupo || '',
      raw: m // Guardamos la referencia por las dudas
    };
  });

  // Lógica de filtrado utilizando la lista normalizada segura
  const filteredAndSortedMovements = normalizedMovements
    .filter(m => {
      const movementDate = getLocalMidnight(m.date);
      const start = filterStartDate ? createLocalDate(filterStartDate) : null;
      const end = filterEndDate ? createLocalDate(filterEndDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      // Filtro por cuenta
      const coincideCuenta = filterAccount === 'all' || m.accountId === filterAccount;

      // Filtro por categoría
      const coincideCategoria = filterCategory === 'all' || m.category === filterCategory;

      // Filtro por tipo de movimiento
      const coincideTipo = filterType === 'all' || m.typeCode === filterType;

      // Filtro por grupo
      const coincideGrupo = filterGroup === 'all' || m.group === filterGroup;

      // Filtro por rango de fechas
      const coincideFecha = (!start || movementDate >= start) && (!end || movementDate <= end);

      return coincideCuenta && coincideCategoria && coincideTipo && coincideGrupo && coincideFecha;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      let valA: any = a[sortField as keyof typeof a];
      let valB: any = b[sortField as keyof typeof b];

      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortField === 'amount') {
        valA = Number(valA);
        valB = Number(valB);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Paginación
  const indexOfLastMovement = currentPage * movementsPerPage;
  const indexOfFirstMovement = indexOfLastMovement - movementsPerPage;
  const currentMovements = filteredAndSortedMovements.slice(indexOfFirstMovement, indexOfLastMovement);
  const totalPages = Math.ceil(filteredAndSortedMovements.length / movementsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Últimos Movimientos</h2>
      </div>

      <div className="overflow-x-auto">
        {/* Panel de Filtros */}
        <div className="bg-white p-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-slate-200 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Cuenta</label>
            <select
              value={filterAccount}
              onChange={(e) => { setFilterAccount(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
            >
              <option value="all">Todas las Cuentas</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Categoría</label>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
            >
              <option value="all">Todas las Categorías</option>
              {accountCategories && accountCategories.map((category: any) => (
                <option key={category.id || category} value={category.id || category}>
                  {category.name || category.nombre || String(category)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Grupo</label>
            <select
              value={filterGroup}
              onChange={(e) => { setFilterGroup(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
            >
              <option value="all">Todos los Grupos</option>
              {accountGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Tipo</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
            >
              <option value="all">Todos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
              <option value="transfer">Transferencia</option>
              <option value="adjustment">Ajuste</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
              />
            </div>
          </div>
          <div>
            <button
              onClick={handleClearFilters}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-300 transition"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Estructura de la Tabla */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date')}>
                <div className="flex items-center justify-between">
                  Fecha <ArrowUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('description')}>
                <div className="flex items-center justify-between">
                  Descripción <ArrowUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th className="p-4">Cuenta Involucrada</th>
              <th className="p-4 text-center">Tipo</th>
              <th className="p-4 text-center">Moneda</th>
              <th className="p-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end">
                  Monto <ArrowUpDown size={14} className="ml-1" />
                </div>
              </th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {currentMovements.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">No hay movimientos registrados con los filtros actuales.</td>
              </tr>
            ) : (
              currentMovements.map((m) => {
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    {/* Render de Fecha robusto */}
                    <td className="p-4">
                      {m.date ? new Date(m.date).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Invalid Date'}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{m.description}</td>
                    
                    {/* Cuenta mapeada por ID relacional */}
                    <td className="p-4 text-slate-600 font-medium">
                      {m.accountName || 'Entidad Externa / Ajuste'}
                    </td>
                    
                    {/* Badge del tipo de movimiento */}
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.typeCode === 'income' ? 'bg-green-100 text-green-700' : 
                        m.typeCode === 'expense' ? 'bg-red-100 text-red-700' : 
                        m.typeCode === 'transfer' ? 'bg-blue-100 text-blue-700' : 
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {m.typeLabel}
                      </span>
                    </td>
                    
                    {/* Badge de Moneda */}
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${m.currency === 'ARS' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {m.currency}
                      </span>
                    </td>
                    
                    {/* Impacto de Monto numérico formateado */}
                    <td className={`p-4 text-right font-bold ${
                      m.typeCode === 'income' ? 'text-green-600' : 
                      m.typeCode === 'expense' ? 'text-red-600' : 
                      'text-blue-600'
                    }`}>
                      {m.typeCode === 'income' ? '+ ' : m.typeCode === 'expense' ? '- ' : ''}
                      $ {m.amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    
                    <td className="p-4 text-center">
                      <button
                        onClick={() => deleteMovement(m.id)}
                        className="text-red-600 hover:text-red-900 transition transform hover:scale-110"
                        title="Anular Movimiento"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Controles de Paginación */}
        {filteredAndSortedMovements.length > movementsPerPage && (
          <div className="p-4 flex justify-center items-center space-x-2 border-t border-slate-200">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-700">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsTable;