"use client";

import { useState, useEffect } from "react";
import { useFinanzasStore } from "@/lib/store.tsx";
import { Account, Movement } from "../types/finanzas";
import AccountDetailModal from "@/components/AccountDetailModal";
import DashboardKPIs from "@/components/DashboardKPIs";
import AccountList from "@/components/AccountList";
import TransactionsTable from "@/components/TransactionsTable";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  
   const { movements, accounts, addMovement, deleteMovement, getAccountBalance, accountCategories, accountGroups, fetchInitialData, getTotalARS, getTotalUSD, movementTypes } = useFinanzasStore();

  // Guardamos por defecto el código 'income' que es el que reconoce Supabase
  const [selectedMovementTypeId, setSelectedMovementTypeId] = useState<string>('');
  const [selectedMovementTypeCode, setSelectedMovementTypeCode] = useState<string>('income');

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setMounted(true);
    if (movementTypes && movementTypes.length > 0 && !selectedMovementTypeId) {
      // Buscamos 'income' en lugar de 'ingreso'
      const defaultIncomeType = movementTypes.find(mt => mt.code === 'income');
      if (defaultIncomeType) {
        setSelectedMovementTypeId(defaultIncomeType.id);
        setSelectedMovementTypeCode('income');
      } else {
        setSelectedMovementTypeId(movementTypes[0].id);
        setSelectedMovementTypeCode(movementTypes[0].code || '');
      }
    }
  }, [movementTypes, selectedMovementTypeId]);

  // Filtros de la tabla
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "transfer" | "adjustment">("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const handleClearFilters = () => {
    setFilterAccount("all");
    setFilterCategory("all");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterType("all");
    setFilterGroup("all");
  };

  const [currentPage, setCurrentPage] = useState(1);
  const movementsPerPage = 10;

  // Estados del Formulario
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [sourceAccountText, setSourceAccountText] = useState("");
  const [targetAccountText, setTargetAccountText] = useState("");
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState("");

  const totalARS = getTotalARS();
  const totalUSD = getTotalUSD();

  // MATRIZ CONTABLE CORREGIDA - Evaluación de bloqueos infalible
// MATRIZ CONTABLE SINCRONIZADA CON SUPABASE ('income', 'expense', 'transfer', 'adjustment')
  const isSelectOrigenDisabled = selectedMovementTypeCode === 'income' || selectedMovementTypeCode === 'adjustment';
  const isTextOrigenDisabled = selectedMovementTypeCode === 'expense' || selectedMovementTypeCode === 'transfer' || selectedMovementTypeCode === 'adjustment';

  const isSelectDestinoDisabled = selectedMovementTypeCode === 'expense' || selectedMovementTypeCode === 'adjustment';
  const isTextDestinoDisabled = selectedMovementTypeCode === 'income' || selectedMovementTypeCode === 'transfer' || selectedMovementTypeCode === 'adjustment';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedMovementTypeId) {
      setErrorMessage("Por favor, seleccioná un tipo de movimiento válido.");
      return;
    }

    if (!description || !amount) {
      setErrorMessage("Por favor, completá la descripción y el monto.");
      return;
    }

    let finalSource: string | undefined = undefined;
    let finalTarget: string | undefined = undefined;
    let finalMovementAccountId: string = "";
    let finalCategory: string | null = null;
    let extraInfo = "";

    // PROCESO DE LOGICA CONTABLE CON VALIDACIONES (Sincronizado en inglés)
    if (selectedMovementTypeCode === 'income') {
      if (!targetAccountId) {
        setErrorMessage("Debés seleccionar una cuenta destino del sistema.");
        return;
      }
      finalSource = sourceAccountText || undefined;
      finalTarget = targetAccountId;
      finalMovementAccountId = targetAccountId;
      if (sourceAccountText) extraInfo = ` (Origen: ${sourceAccountText})`;

    } else if (selectedMovementTypeCode === 'expense') {
      if (!sourceAccountId) {
        setErrorMessage("Debés seleccionar una cuenta origen del sistema.");
        return;
      }
      finalSource = sourceAccountId;
      finalTarget = targetAccountText || undefined;
      finalMovementAccountId = sourceAccountId;
      if (targetAccountText) extraInfo = ` (Destino: ${targetAccountText})`;

    } else if (selectedMovementTypeCode === 'transfer') {
      if (!sourceAccountId || !targetAccountId) {
        setErrorMessage("Para transferencias debés seleccionar origen y destino del sistema.");
        return;
      }
      if (sourceAccountId === targetAccountId) {
        setErrorMessage("La cuenta origen y destino no pueden ser iguales.");
        return;
      }
      finalSource = sourceAccountId;
      finalTarget = targetAccountId;
      finalMovementAccountId = sourceAccountId;

    } else if (selectedMovementTypeCode === 'adjustment') {
      const referenceAccount = targetAccountId || sourceAccountId;
      if (!referenceAccount) {
        setErrorMessage("Seleccioná al menos una cuenta del sistema para aplicar el ajuste.");
        return;
      }
      finalSource = referenceAccount;
      finalTarget = referenceAccount;
      finalMovementAccountId = referenceAccount;
    }

    const systemAccount = accounts.find(acc => acc.id === finalMovementAccountId);
    if (systemAccount && systemAccount.moneda !== currency) {
      setErrorMessage(`La cuenta elegida opera en ${systemAccount.moneda}. No coincide con la moneda seleccionada.`);
      return;
    }

    if (systemAccount) {
      finalCategory = systemAccount.categoria;
    }

    addMovement({
      descripcion: description + extraInfo,
      monto: parseFloat(amount),
      moneda: currency,
      movement_type_id: selectedMovementTypeId,
      cuentaId: finalMovementAccountId,
      categoria: finalCategory,
      sourceAccountId: finalSource,
      targetAccountId: finalTarget,
      fecha: date,
    });

    // Limpieza
    setDescription("");
    setAmount("");
    setCurrency("ARS");
    setSourceAccountId("");
    setTargetAccountId("");
    setSourceAccountText("");
    setTargetAccountText("");
    setDate(new Date().toISOString().split('T')[0]);
    setIsMovementModalOpen(false);
  };

  const openAccountDetailModal = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const closeAccountDetailModal = () => {
    setSelectedAccountId(null);
  };

  if (!mounted) return null;

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
          + Nueva entrada
        </button>
      </div>

      <DashboardKPIs />

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

      {/* MODAL INTERACTIVO FUNCIONAL */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Agregar Nueva entrada</h3>
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
                  <select 
                    value={selectedMovementTypeId}
                    onChange={(e) => {
                      const targetId = e.target.value;
                      const foundType = movementTypes.find(mt => mt.id === targetId);
                      setSelectedMovementTypeId(targetId);
                      setSelectedMovementTypeCode(foundType ? foundType.code : '');
                      
                      // Limpiar campos para evitar errores cruzados
                      setSourceAccountId("");
                      setTargetAccountId("");
                      setSourceAccountText("");
                      setTargetAccountText("");
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
                  >
                    {movementTypes.map((mt) => (
                      <option key={mt.id} value={mt.id}>{mt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Moneda</label>
                  <select 
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value as "ARS" | "USD");
                      setSourceAccountId("");
                      setTargetAccountId("");
                      setSourceAccountText("");
                      setTargetAccountText("");
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-medium border border-red-100">{errorMessage}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* COLUMNA CUENTA ORIGEN */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuenta Origen</label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    disabled={isSelectOrigenDisabled}
                    required={!isSelectOrigenDisabled}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm mb-2 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Seleccionar Cuenta...</option>
                    {accounts.filter(acc => acc.moneda === currency).map((account) => (
                      <option key={account.id} value={account.id}>{account.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="O escribir texto libre..."
                    value={sourceAccountText}
                    onChange={(e) => setSourceAccountText(e.target.value)}
                    disabled={isTextOrigenDisabled}
                    required={!isTextOrigenDisabled}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm disabled:bg-slate-100 disabled:placeholder-slate-300"
                  />
                </div>

                {/* COLUMNA CUENTA DESTINO */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuenta Destino</label>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    disabled={isSelectDestinoDisabled}
                    required={!isSelectDestinoDisabled}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm mb-2 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Seleccionar Cuenta...</option>
                    {accounts.filter(acc => acc.moneda === currency).map((account) => (
                      <option key={account.id} value={account.id}>{account.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="O escribir texto libre..."
                    value={targetAccountText}
                    onChange={(e) => setTargetAccountText(e.target.value)}
                    disabled={isTextDestinoDisabled}
                    required={!isTextDestinoDisabled}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm disabled:bg-slate-100 disabled:placeholder-slate-300"
                  />
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

      {selectedAccountId && (
        <AccountDetailModal
          accountId={selectedAccountId}
          onClose={closeAccountDetailModal}
        />
      )}
    </div>
  );
}