import React from 'react';
import { useFinanzasStore } from "@/lib/store";

interface BalanceCardsProps {
  totalARS: number;
  totalUSD: number;
  getBalancesByCategory: (currency: "ARS" | "USD") => { [category: string]: number };
}

const BalanceCards: React.FC<BalanceCardsProps> = ({ totalARS, totalUSD, getBalancesByCategory }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Saldo Total ARS */}
      <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl flex flex-col justify-between transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Saldo Total ARS</p>
          <p className="text-2xl font-bold mt-2 leading-tight">
            $ {totalARS.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Saldo Total USD */}
      <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex flex-col justify-between transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Saldo Total USD</p>
          <p className="text-2xl font-bold mt-2 leading-tight">
            US$ {totalUSD.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Saldos por Categoría (ARS) */}
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

      {/* Saldos por Categoría (USD) */}
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
  );
};

export default BalanceCards;
