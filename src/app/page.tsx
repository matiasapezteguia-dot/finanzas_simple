"use client";

import { useState, useEffect } from "react";
import { useFinanzasStore } from "@/lib/store.tsx";
import AccountDetailModal from "@/components/AccountDetailModal";
import DashboardKPIs from "@/components/DashboardKPIs";
import AccountList from "@/components/AccountList";
import TransactionsTable from "@/components/TransactionsTable";
import AddTransactionModal from "@/components/modals/AddTransactionModal";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  
  const { 
    movements, 
    accounts, 
    deleteMovement, 
    getAccountBalance, 
    accountCategories, 
    accountGroups, 
    fetchInitialData, 
    getTotalARS, 
    getTotalUSD 
  } = useFinanzasStore();

  useEffect(() => {
    fetchInitialData();
    setMounted(true);
  }, []);

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

      <AddTransactionModal 
        isOpen={isMovementModalOpen} 
        onClose={() => setIsMovementModalOpen(false)} 
      />

      {selectedAccountId && (
        <AccountDetailModal
          accountId={selectedAccountId}
          onClose={closeAccountDetailModal}
        />
      )}
    </div>
  );
}