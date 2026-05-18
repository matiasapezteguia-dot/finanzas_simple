import React from 'react';
import { Account } from "../types/finanzas";

interface AccountListProps {
  accounts: Account[];
  getAccountBalance: (accountId: string) => number;
  openAccountDetailModal: (accountId: string) => void;
}

const AccountList: React.FC<AccountListProps> = ({ accounts, getAccountBalance, openAccountDetailModal }) => {
  // Agrupar cuentas por categoría
  const groupedAccounts = accounts.reduce((acc, account) => {
    const category = account.categoria || 'Sin Categoría'; // Asignar una categoría por defecto si no existe
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Cuentas</h2>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Grid layout for categories */}
        {Object.entries(groupedAccounts).map(([category, categoryAccounts]) => (
          <div key={category}>
            <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-2">{category.toUpperCase()}</h3>
            <div className="flex flex-col gap-1.5">
              {categoryAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 text-sm transition-all cursor-pointer hover:bg-slate-50"
                  onClick={() => openAccountDetailModal(account.id)}
                >
                  <span className="font-medium text-slate-900">{account.nombre}</span>
                  <span className="font-semibold text-slate-700">
                    {account.moneda === "ARS" ? "$" : "US$"}{" "}
                    {getAccountBalance(account.id).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountList;
