"use client";

import { useState, useEffect } from "react";
import { useFinanzasStore, Account, Movement } from "@/lib/store";
import AccountDetailModal from "@/components/AccountDetailModal";
import DashboardAccounts from "@/components/DashboardAccounts";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    movements,
    accounts,
    addMovement,
    deleteMovement, // Importar deleteMovement
    getBalance,
    getAccountBalance,
    accountGroups,
    accountCategories,
    getBalancesByGroup,
    getBalancesByCategory,
  } = useFinanzasStore();
  
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Estados para filtros de la tabla de movimientos
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const movementsPerPage = 10;

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [type, setType] = useState<"income" | "expense" | "transfer">("income");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState("");

  const totalARS = getBalance("ARS");
  const totalUSD = getBalance("USD");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!description || !amount || (!sourceAccountId && !targetAccountId)) {
      setErrorMessage("Por favor, completá la descripción, el monto y al menos una cuenta de origen o destino.");
      return;
    }

    const isSourceAccountSystem = accounts.some(acc => acc.id === sourceAccountId);
    const isTargetAccountSystem = accounts.some(acc => acc.id === targetAccountId);

    // REGLA 1 (Validación de Monedas en Transferencias)
    if (type === 'transfer') {
      const sourceAccount = accounts.find(acc => acc.id === sourceAccountId);
      const targetAccount = accounts.find(acc => acc.id === targetAccountId);
      if (!sourceAccount || !targetAccount) {
        setErrorMessage("Para una transferencia, ambas cuentas (origen y destino) deben ser cuentas del sistema.");
        return;
      }
      if (sourceAccountId === targetAccountId) {
        setErrorMessage("La cuenta de origen y destino en una transferencia deben ser diferentes.");
        return;
      }
      if (sourceAccount.currency !== targetAccount.currency) {
        setErrorMessage("No se permiten transferencias directas entre cuentas de distinta moneda.");
        return;
      }
    }

    // REGLA 2 (Antiduplicación)
    if ((type === 'income' || type === 'expense') && isSourceAccountSystem && isTargetAccountSystem) {
      setErrorMessage("Para movimientos entre dos cuentas del sistema, debés seleccionar el tipo 'Transferencia'.");
      return;
    }

    // REGLA 3 (Impacto Cero Prohibido)
    if (!isSourceAccountSystem && !isTargetAccountSystem) {
      setErrorMessage("El movimiento debe impactar al menos en una cuenta del sistema.");
      return;
    }

    // Ajustar sourceAccountId y targetAccountId para el guardado, convirtiendo string vacío a undefined
    const finalSourceAccountId = sourceAccountId === '' ? undefined : sourceAccountId;
    const finalTargetAccountId = targetAccountId === '' ? undefined : targetAccountId;

    addMovement({
      description,
      amount: parseFloat(amount),
      currency,
      type: type,
      sourceAccountId: finalSourceAccountId,
      targetAccountId: finalTargetAccountId,
      date,
    });

    setDescription("");
    setAmount("");
    setCurrency("ARS");
    setType("income");
    setSourceAccountId("");
    setTargetAccountId("");
    setDate(new Date().toISOString().split('T')[0]);
    setIsMovementModalOpen(false);
  };

  const openAccountDetailModal = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const closeAccountDetailModal = () => {
    setSelectedAccountId(null);
  };

  if (!mounted) {
    return null; // O un spinner
  }

  // Lógica de filtrado y paginación
  const filteredAndSortedMovements = movements
    .filter(m => {
      // Filtro por cuenta
      if (filterAccount !== "all" && m.sourceAccountId !== filterAccount && m.targetAccountId !== filterAccount) {
        return false;
      }
      // Filtro por categoría (requiere buscar la cuenta asociada al movimiento)
      if (filterCategory !== "all") {
        const sourceAccount = accounts.find(acc => acc.id === m.sourceAccountId);
        const targetAccount = accounts.find(acc => acc.id === m.targetAccountId);
        if (sourceAccount?.categoryId !== filterCategory && targetAccount?.categoryId !== filterCategory) {
          return false;
        }
      }
      // Filtro por rango de fechas
      if (filterStartDate && m.date < filterStartDate) {
        return false;
      }
      if (filterEndDate && m.date > filterEndDate) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordenar por fecha descendente

  // Paginación
  const indexOfLastMovement = currentPage * movementsPerPage;
  const indexOfFirstMovement = indexOfLastMovement - movementsPerPage;
  const currentMovements = filteredAndSortedMovements.slice(indexOfFirstMovement, indexOfLastMovement);
  const totalPages = Math.ceil(filteredAndSortedMovements.length / movementsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
  <div className="p-8 w-full mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Finanzas Bimonetarias</h1>
        <p className="text-slate-500">Control de caja real para PyMEs</p>
      </div>

      {/* Tarjetas de Saldo Dinámicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Saldo Total ARS */}
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Saldo Total ARS</p>
            <p className="text-4xl font-bold mt-2">
              $ {totalARS.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Saldo Total USD */}
        <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Saldo Total USD</p>
            <p className="text-4xl font-bold mt-2">
              US$ {totalUSD.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Recuadro 1: Saldos por Grupo (ARS) */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Saldos por Grupo (ARS)</h3>
          <ul className="space-y-2">
            {Object.entries(getBalancesByGroup("ARS")).map(([group, balance]) => (
              <li key={group} className="flex justify-between items-center text-sm text-slate-700">
                <span>{group}</span>
                <span className="font-semibold">
                  $ {balance.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recuadro 1: Saldos por Grupo (USD) */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Saldos por Grupo (USD)</h3>
          <ul className="space-y-2">
            {Object.entries(getBalancesByGroup("USD")).map(([group, balance]) => (
              <li key={group} className="flex justify-between items-center text-sm text-slate-700">
                <span>{group}</span>
                <span className="font-semibold">
                  US$ {balance.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recuadro 2: Saldos por Categoría (ARS) */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Saldos por Categoría (ARS)</h3>
          <ul className="space-y-2">
            {Object.entries(getBalancesByCategory("ARS")).map(([category, balance]) => (
              <li key={category} className="flex justify-between items-center text-sm text-slate-700">
                <span>{category}</span>
                <span className="font-semibold">
                  $ {balance.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recuadro 2: Saldos por Categoría (USD) */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Saldos por Categoría (USD)</h3>
          <ul className="space-y-2">
            {Object.entries(getBalancesByCategory("USD")).map(([category, balance]) => (
              <li key={category} className="flex justify-between items-center text-sm text-slate-700">
                <span>{category}</span>
                <span className="font-semibold">
                  US$ {balance.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Componente de Cuentas */}
      <DashboardAccounts
        accounts={accounts}
        getAccountBalance={getAccountBalance}
        openAccountDetailModal={openAccountDetailModal}
      />

      {/* Tabla de Movimientos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Últimos Movimientos</h2>
          <button 
            onClick={() => setIsMovementModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            + Nuevo Registro
          </button>
        </div>

        <div className="overflow-x-auto">
          {/* Filtros Globales */}
          <div className="bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200">
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
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Descripción</th>
                <th className="p-4">Origen</th>
                <th className="p-4">Destino</th>
                <th className="p-4 text-center">Tipo</th>
                <th className="p-4 text-center">Moneda</th>
                <th className="p-4 text-right">Monto</th>
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
                  const sourceAccountName = accounts.find(acc => acc.id === m.sourceAccountId)?.name || m.sourceAccountId || '';
                  const targetAccountName = accounts.find(acc => acc.id === m.targetAccountId)?.name || m.targetAccountId || '';

                  const displaySource = m.type === 'transfer' ? sourceAccountName : (m.sourceAccountId ? sourceAccountName : 'Entidad Externa');
                  const displayTarget = m.type === 'transfer' ? targetAccountName : (m.targetAccountId ? targetAccountName : 'Entidad Externa');

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-medium text-slate-900">{m.description}</td>
                      <td className="p-4">
                        {m.type === 'transfer' ? '' : displaySource}
                      </td>
                      <td className="p-4">
                        {m.type === 'transfer' ? `${displaySource} ➔ ${displayTarget}` : displayTarget}
                      </td>
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


      {/* MODAL INTERACTIVO DE REGISTRO */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Agregar Nuevo Registro</h3>
              <p className="text-xs text-slate-500">Ingresá los datos reales del movimiento de caja</p>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Pago Proveedor, Venta Servicio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value as "income" | "expense")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
                  >
                    <option value="income">Ingreso</option>
                    <option value="expense">Egreso</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monto</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Moneda</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "ARS" | "USD")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="text-red-500 text-sm">{errorMessage}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Campo Cuenta Origen */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuenta Origen</label>
                  {(type === 'income' || type === 'expense' || type === 'transfer') && (
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
                      disabled={type === 'income'} // Deshabilitar si es ingreso
                      required={type === 'expense' || type === 'transfer'} // Requerido si es egreso o transferencia
                    >
                      <option value="">{type === 'income' ? 'Entidad Externa' : 'Seleccionar Cuenta'}</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>
                      ))}
                    </select>
                  )}
                  {(type === 'income' || type === 'expense') && ( // Mostrar texto libre solo para income/expense
                    <input
                      type="text"
                      placeholder="O escribir texto libre..."
                      value={type === 'income' ? sourceAccountId : ''} // Solo mostrar texto libre para income
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      disabled={type === 'expense'} // Deshabilitar si es egreso
                      className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                    />
                  )}
                </div>

                {/* Campo Cuenta Destino */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuenta Destino</label>
                  {(type === 'income' || type === 'expense' || type === 'transfer') && (
                    <select
                      value={targetAccountId}
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
                      disabled={type === 'expense'} // Deshabilitar si es egreso
                      required={type === 'income' || type === 'transfer'} // Requerido si es ingreso o transferencia
                    >
                      <option value="">{type === 'expense' ? 'Entidad Externa' : 'Seleccionar Cuenta'}</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>
                      ))}
                    </select>
                  )}
                  {(type === 'income' || type === 'expense') && ( // Mostrar texto libre solo para income/expense
                    <input
                      type="text"
                      placeholder="O escribir texto libre..."
                      value={type === 'expense' ? targetAccountId : ''} // Solo mostrar texto libre para expense
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      disabled={type === 'income'} // Deshabilitar si es ingreso
                      className="w-full px-3 py-2 mt-1 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                />
              </div>

              <div className="pt-4 flex space-x-3 justify-end border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Cuenta */}
      {selectedAccountId && (
        <AccountDetailModal
          accountId={selectedAccountId}
          onClose={closeAccountDetailModal}
        />
      )}
    </div>
  );
}
