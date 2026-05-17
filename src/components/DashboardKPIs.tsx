
import React from 'react';

import { useFinanzasStore, Account } from '../lib/store';

const DashboardKPIs: React.FC = () => {
  const { accounts, getAccountBalance } = useFinanzasStore();

  const totalARS = React.useMemo(() => {
    return accounts
      .filter(account => account.currency === 'ARS')
      .reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);

  const totalUSD = React.useMemo(() => {
    return accounts
      .filter(account => account.currency === 'USD')
      .reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);

  const totalInversiones = React.useMemo(() => {
    return accounts
      .filter(account => account.categoryId === 'Inversiones' && account.currency === 'ARS')
      .reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);

  const totalDisponible = React.useMemo(() => {
    return accounts
      .filter(account => account.categoryId === 'Uso Diario' || account.categoryId === 'Efectivo')
      .reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);

  const formatCurrency = (value: number, currency: 'ARS' | 'USD') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Tarjeta Total ARS */}
      <div className="rounded-lg bg-blue-600 p-4 text-white shadow-md">
        <h3 className="text-lg font-semibold">Total ARS</h3>
        <p className="text-2xl font-bold">{formatCurrency(totalARS, 'ARS')}</p>
      </div>

      {/* Tarjeta Total Disponible */}
      <div className="rounded-lg bg-indigo-600 p-4 text-white shadow-md">
        <h3 className="text-lg font-semibold">Total Disponible</h3>
        <p className="text-2xl font-bold">{formatCurrency(totalDisponible, 'ARS')}</p> {/* Assuming available is in ARS for display */}
      </div>

      {/* Tarjeta Total Inversiones */}
      <div className="rounded-lg bg-purple-600 p-4 text-white shadow-md">
        <h3 className="text-lg font-semibold">INVERSIONES ARS</h3>
        <p className="text-2xl font-bold">{formatCurrency(totalInversiones, 'ARS')}</p> {/* Assuming investments are in ARS for display */}
      </div>

      {/* Tarjeta Total USD */}
      <div className="rounded-lg bg-green-600 p-4 text-white shadow-md">
        <h3 className="text-lg font-semibold">Total USD</h3>
        <p className="text-2xl font-bold">{formatCurrency(totalUSD, 'USD')}</p>
      </div>
    </div>
  );
};

export default DashboardKPIs;
