import React from 'react';
import { Account, Movement } from "@/lib/store";

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
  filterType: "all" | "income" | "expense" | "transfer";
  setFilterType: (type: "all" | "income" | "expense" | "transfer") => void;
  filterGroup: string;
  setFilterGroup: (group: string) => void;
  handleClearFilters: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  movementsPerPage: number;
  accountCategories: string[];
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

  // Lógica de filtrado y paginación
  const filteredAndSortedMovements = movements
    .filter(m => {
      const movementDate = new Date(m.date);
      movementDate.setHours(0, 0, 0, 0); // Ignorar la hora para la comparación

      const start = filterStartDate ? new Date(filterStartDate) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = filterEndDate ? new Date(filterEndDate) : null;
      if (end) end.setHours(0, 0, 0, 0);

      const sourceAccount = accounts.find(acc => acc.id === m.sourceAccountId);
      const targetAccount = accounts.find(acc => acc.id === m.targetAccountId);

      // Filtro por cuenta
      const coincideCuenta = filterAccount === 'all' || m.sourceAccountId === filterAccount || m.targetAccountId === filterAccount;

      // Filtro por categoría
      let coincideCategoria = filterCategory === 'all';
      if (!coincideCategoria) {
        if (m.type === 'income' && targetAccount) {
          coincideCategoria = targetAccount.categoryId === filterCategory;
        } else if (m.type === 'expense' && sourceAccount) {
          coincideCategoria = sourceAccount.categoryId === filterCategory;
        } else if (m.type === 'transfer' && sourceAccount && targetAccount) {
          coincideCategoria = sourceAccount.categoryId === filterCategory && targetAccount.categoryId === filterCategory;
        }
      }

      // Filtro por tipo de movimiento
      const coincideTipo = filterType === 'all' || m.type.toLowerCase().trim() === filterType.toLowerCase().trim();

      // Filtro por grupo
      let coincideGrupo = filterGroup === 'all';
      if (!coincideGrupo) {
        if (m.type === 'income' && targetAccount) {
          coincideGrupo = targetAccount.groupId === filterGroup;
        } else if (m.type === 'expense' && sourceAccount) {
          coincideGrupo = sourceAccount.groupId === filterGroup;
        } else if (m.type === 'transfer' && sourceAccount && targetAccount) {
          coincideGrupo = sourceAccount.groupId === filterGroup && targetAccount.groupId === filterGroup;
        }
      }

      // Filtro por rango de fechas
      const coincideFecha = (!start || movementDate >= start) && (!end || movementDate <= end);

      return coincideCuenta && coincideCategoria && coincideTipo && coincideGrupo && coincideFecha;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordenar por fecha descendente

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
        {/* El botón "+ Nuevo Registro" se mantendrá en page.tsx para abrir el modal */}
      </div>

      <div className="overflow-x-auto">
        {/* Filtros Globales */}
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
                <option key={account.id} value={account.id}>{account.name}</option>
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
              {accountCategories.map(category => (
                <option key={category} value={category}>{category}</option>
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
              onChange={(e) => { setFilterType(e.target.value as "all" | "income" | "expense" | "transfer"); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
            >
              <option value="all">Todos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
              <option value="transfer">Transferencia</option>
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
                max={filterEndDate || undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                min={filterStartDate || undefined}
              />
            </div>
          </div>
          <div className="col-span-full md:col-span-1 flex justify-end md:justify-start">
            <button
              onClick={handleClearFilters}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-300 transition"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="p-4">Descripción</th>
              <th className="p-4">Origen</th>
              <th className="p-4">Destino</th>
              <th className="p-4 text-center">Categoría</th>
              <th className="p-4 text-center">Grupo</th>
              <th className="p-4 text-center">Tipo</th>
              <th className="p-4 text-center">Moneda</th>
              <th className="p-4 text-right">Monto</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {currentMovements.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">No hay movimientos registrados con los filtros actuales.</td>
              </tr>
            ) : (
              currentMovements.map((m) => {
                const sourceAccount = accounts.find(acc => acc.id === m.sourceAccountId);
                const targetAccount = accounts.find(acc => acc.id === m.targetAccountId);

                const sourceAccountName = sourceAccount?.name || m.sourceAccountId || '';
                const targetAccountName = targetAccount?.name || m.targetAccountId || '';

                const displaySource = m.type === 'transfer' ? sourceAccountName : (m.sourceAccountId ? sourceAccountName : 'Entidad Externa');
                const displayTarget = m.type === 'transfer' ? targetAccountName : (m.targetAccountId ? targetAccountName : 'Entidad Externa');

                const displayCategory = sourceAccount?.categoryId || targetAccount?.categoryId || '';
                const displayGroup = sourceAccount?.groupId || targetAccount?.groupId || '';

                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-medium text-slate-900">{m.description}</td>
                    <td className="p-4">
                      {m.type === 'transfer' ? '' : displaySource}
                    </td>
                    <td className="p-4">
                      {m.type === 'transfer' ? `${displaySource} ➔ ${displayTarget}` : displayTarget}
                    </td>
                    <td className="p-4 text-center">{displayCategory}</td>
                    <td className="p-4 text-center">{displayGroup}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.type === 'income' ? 'bg-green-100 text-green-700' : m.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {m.type === 'income' ? 'Ingreso' : m.type === 'expense' ? 'Egreso' : 'Transferencia'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${m.currency === 'ARS' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {m.currency}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${m.type === 'income' ? 'text-green-600' : m.type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                      {m.type === 'income' ? '+ ' : m.type === 'expense' ? '- ' : ''}$ {Number(m.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => deleteMovement(m.id)}
                        className="text-red-600 hover:text-red-900"
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
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-700">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
