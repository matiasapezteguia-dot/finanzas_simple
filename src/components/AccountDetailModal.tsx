"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFinanzasStore } from "@/lib/store.tsx";
import { Movement, Account } from "../types/finanzas";

interface AccountDetailModalProps {
  accountId: string | null;
  onClose: () => void;
}

const AccountDetailModal: React.FC<AccountDetailModalProps> = ({ accountId, onClose }) => {
  const { accounts, movements, getAccountBalance, getBalancesByGroup } = useFinanzasStore();
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [filteredMovements, setFilteredMovements] = useState<Movement[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [filteredBalance, setFilteredBalance] = useState(0);

  useEffect(() => {
    if (accountId) {
      const selectedAccount = accounts.find((acc) => acc.id === accountId);
      setAccount(selectedAccount);
      applyFilters(selectedAccount, movements, startDate, endDate, movementTypeFilter);
    } else {
      setAccount(undefined);
      setFilteredMovements([]);
      setFilteredBalance(0);
    }
  }, [accountId, accounts, movements, startDate, endDate, movementTypeFilter]);

  const applyFilters = (
    selectedAccount: Account | undefined,
    allMovements: Movement[],
    start: string,
    end: string,
    typeFilter: "all" | "income" | "expense" | "transfer"
  ) => {
    if (!selectedAccount) return;

    let tempMovements = allMovements.filter((m) =>
      m.sourceAccountId === selectedAccount.id || m.targetAccountId === selectedAccount.id
    );

    if (start) {
      tempMovements = tempMovements.filter((m) => m.date >= start);
    }
    if (end) {
      tempMovements = tempMovements.filter((m) => m.date <= end);
    }
    if (typeFilter !== "all") {
      tempMovements = tempMovements.filter((m) => m.type === typeFilter);
    }

    setFilteredMovements(tempMovements);

    // Calculate "Saldo Neto del Período"
    let netBalance = 0; // Start with 0 for net balance of the period
    tempMovements.forEach((m) => {
      if (m.targetAccountId === selectedAccount.id) {
        // Movement is incoming to the selected account
        netBalance += m.amount;
      } else if (m.sourceAccountId === selectedAccount.id) {
        // Movement is outgoing from the selected account
        netBalance -= m.amount;
      }
    });
    setFilteredBalance(netBalance);
  };

  const totalGroupBalance = useMemo(() => {
    if (!account) return { ARS: 0, USD: 0 };
    const balances = getBalancesByGroup(account.currency);
    return { [account.currency]: balances[account.groupId] || 0 };
  }, [account, getBalancesByGroup]);

  if (!accountId || !account) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Detalle de Cuenta: {account.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Moneda</p>
              <p className="text-slate-900">{account.currency}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Saldo Actual</p>
              <p className="text-slate-900 font-bold">
                {account.currency === "ARS" ? "$" : "US$"}{" "}
                {getAccountBalance(account.id).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Grupo {account.groupId}</p>
              <p className="text-slate-900 font-bold">
                {account.currency === "ARS" ? "$" : "US$"}{" "}
                {totalGroupBalance[account.currency]?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-slate-50 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Movimiento</label>
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value as "all" | "income" | "expense" | "transfer")}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-900 text-sm"
              >
                <option value="all">Todos</option>
                <option value="income">Ingreso</option>
                <option value="expense">Egreso</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>

          {/* Saldo del Filtro */}
          <div className="bg-blue-50 p-4 rounded-xl text-blue-800 font-bold text-center">
            Saldo del Filtro: {account.currency === "ARS" ? "$" : "US$"}{" "}
            {filteredBalance.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {/* Historial de Transacciones */}
          <h4 className="text-md font-bold text-slate-900 mt-6">Historial de Transacciones</h4>
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">No hay movimientos para los filtros seleccionados.</td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const isSource = m.sourceAccountId === account.id;
                    const isTarget = m.targetAccountId === account.id;
                    const displayAmount = isSource ? -m.amount : m.amount;
                    const amountClass = isSource ? "text-red-600" : "text-green-600";

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">{m.date}</td>
                        <td className="p-3">{m.description}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.type === 'income' ? 'bg-green-100 text-green-700' : m.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {m.type === 'income' ? 'Ingreso' : m.type === 'expense' ? 'Egreso' : 'Transferencia'}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${amountClass}`}>
                          {displayAmount > 0 ? '+ ' : '- '}{account.currency === "ARS" ? "$" : "US$"}{" "}
                          {Math.abs(displayAmount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailModal;
