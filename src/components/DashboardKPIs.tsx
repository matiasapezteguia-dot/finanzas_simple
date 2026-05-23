import React from 'react';
import { useFinanzasStore } from '../lib/store';

const DashboardKPIs: React.FC = () => {
  // 1. Extraemos los nuevos métodos limpios del store optimizado
  const { 
    accounts, 
    transactions,
    getTotalARS, 
    getTotalUSD, 
    getAvailableARS, 
    getTotalARSInvestments 
  } = useFinanzasStore();
  


  // 2. Asignamos las variables usando las funciones nativas
  const totalARS = getTotalARS();
  const totalUSD = getTotalUSD();
  const totalInversiones = getTotalARSInvestments();
  const totalDisponible = getAvailableARS();

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
        <p className="text-2xl font-bold">{formatCurrency(totalDisponible, 'ARS')}</p>
      </div>

      {/* Tarjeta Total Inversiones */}
      <div className="rounded-lg bg-purple-600 p-4 text-white shadow-md">
        <h3 className="text-lg font-semibold">INVERSIONES ARS</h3>
        <p className="text-2xl font-bold">{formatCurrency(totalInversiones, 'ARS')}</p>
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