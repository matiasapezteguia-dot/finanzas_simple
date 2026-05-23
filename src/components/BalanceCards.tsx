import React from 'react';
import { useFinanzasStore } from "@/lib/store";

interface BalanceCardsProps {
  totalARS: number;
  totalUSD: number;
  totalARSForDailyUseAndCash: number;
  totalARSInvestments: number;
}

const BalanceCards: React.FC<BalanceCardsProps> = ({ totalARS, totalUSD, totalARSForDailyUseAndCash, totalARSInvestments }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Saldo Total ARS (Uso Diario y Caja Efectivo) */}
      <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl flex flex-col justify-between transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Saldo Total ARS</p>
          <p className="text-2xl font-bold mt-2 leading-tight">
            $ {totalARSForDailyUseAndCash.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Inversiones ARS */}
      <div className="bg-purple-600 text-white p-4 rounded-2xl shadow-xl flex flex-col justify-between transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Inversiones ARS</p>
          <p className="text-2xl font-bold mt-2 leading-tight">
            $ {totalARSInvestments.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BalanceCards;
