import React from 'react';
import { Account } from "@/lib/store"; // Assuming Account type is exported from store

interface DashboardAccountsProps {
  accounts: Account[];
  getAccountBalance: (accountId: string) => number;
  openAccountDetailModal: (accountId: string) => void;
}

const DashboardAccounts: React.FC<DashboardAccountsProps> = ({ accounts, getAccountBalance, openAccountDetailModal }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Cuentas</h2>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Grid layout for cards */}
        {accounts.map((account) => (
          <div
            key={account.id}
            className="bg-slate-50 p-4 rounded-xl shadow-sm border border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors duration-200"
            onClick={() => openAccountDetailModal(account.id)}
          >
            <p className="font-medium text-slate-900 text-lg mb-1">{account.name}</p>
            <p className="text-slate-700 text-sm">
              {account.currency === "ARS" ? "$" : "US$"}{" "}
              {getAccountBalance(account.id).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Categoría: {account.categoryId}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardAccounts;