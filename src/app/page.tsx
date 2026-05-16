"use client";

import { useState, useEffect } from "react";
import { useFinanzasStore, Account, Movement } from "@/lib/store";
import AccountDetailModal from "@/components/AccountDetailModal";
import BalanceCards from "@/components/BalanceCards";
import AccountList from "@/components/AccountList";
import TransactionsTable from "@/components/TransactionsTable";

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
    accountCategories,
    accountGroups,
    getBalancesByCategory,
  } = useFinanzasStore();
  
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Estados para filtros de la tabla de movimientos
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const handleClearFilters = () => {
    setFilterAccount("all");
    setFilterCategory("all");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterType("all");
    setFilterGroup("all");
    // setCurrentPage(1); // Removed as pagination is now in TransactionsTable
  };

  // Estados para paginación (moved to TransactionsTable)
  const [currentPage, setCurrentPage] = useState(1); // Kept for modal logic, but will be passed to TransactionsTable
  const movementsPerPage = 10; // Kept for modal logic, but will be passed to TransactionsTable

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

      // Lógica de filtrado y paginación (moved to TransactionsTable)
      // const filteredAndSortedMovements = movements
      //   .filter(m => {
      //     const movementDate = new Date(m.date);
      //     movementDate.setHours(0, 0, 0, 0); // Ignorar la hora para la comparación

      //     const start = filterStartDate ? new Date(filterStartDate) : null;
      //     if (start) start.setHours(0, 0, 0, 0);

      //     const end = filterEndDate ? new Date(filterEndDate) : null;
      //     if (end) end.setHours(0, 0, 0, 0);

      //     // Filtro por cuenta
      //     const accountMatches = filterAccount === 'all' || m.sourceAccountId === filterAccount || m.targetAccountId === filterAccount;
      //     if (!accountMatches) return false;

      //     // Filtro por categoría
      //     const sourceAccount = accounts.find(acc => acc.id === m.sourceAccountId);
      //     const targetAccount = accounts.find(acc => acc.id === m.targetAccountId);
      //     const categoryMatches = filterCategory === 'all' || 
      //                             (sourceAccount && sourceAccount.categoryId === filterCategory) || 
      //                             (targetAccount && targetAccount.categoryId === filterCategory);
      //     if (!categoryMatches) return false;

      //     // Filtro por tipo de movimiento
      //     const typeMatches = filterType === 'all' || m.type === filterType;
      //     if (!typeMatches) return false;

      //     // Filtro por rango de fechas
      //     const dateMatches = (!start || movementDate >= start) && (!end || movementDate <= end);
      //     if (!dateMatches) return false;

      //     return true;
      //   })
      //   .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordenar por fecha descendente

  // Paginación (moved to TransactionsTable)
  // const indexOfLastMovement = currentPage * movementsPerPage;
  // const indexOfFirstMovement = indexOfLastMovement - movementsPerPage;
  // const currentMovements = filteredAndSortedMovements.slice(indexOfFirstMovement, indexOfLastMovement);
  // const totalPages = Math.ceil(filteredAndSortedMovements.length / movementsPerPage);

  // const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
  <div className="p-8 w-full mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">PV Finanzas</h1>
          <p className="text-slate-500">Control de caja</p>
        </div>
        <button 
          onClick={() => setIsMovementModalOpen(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          + Nuevo Registro
        </button>
      </div>

      <BalanceCards
        totalARS={totalARS}
        totalUSD={totalUSD}
        getBalancesByCategory={getBalancesByCategory}
      />

      {/* Componente de Cuentas */}
      <AccountList
        accounts={accounts}
        getAccountBalance={getAccountBalance}
        openAccountDetailModal={openAccountDetailModal}
      />

      <TransactionsTable
        movements={movements}
        accounts={accounts}
        deleteMovement={deleteMovement}
        filterAccount={filterAccount}
        setFilterAccount={setFilterAccount}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterStartDate={filterStartDate}
        setFilterStartDate={setFilterStartDate}
        filterEndDate={filterEndDate}
        setFilterEndDate={setFilterEndDate}
        filterType={filterType}
        setFilterType={setFilterType}
        handleClearFilters={handleClearFilters}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        movementsPerPage={movementsPerPage}
        accountCategories={accountCategories}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
        accountGroups={accountGroups}
      />


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
