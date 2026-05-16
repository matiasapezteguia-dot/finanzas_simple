'use client';

import React, { useState, useEffect } from 'react';
import { useFinanzasStore, Account } from '../../lib/store';

interface TabProps {
  label: string;
  children: React.ReactNode;
}

const Tab: React.FC<TabProps> = ({ children }) => {
  return <div className="p-4">{children}</div>;
};

interface TabsProps {
  children: React.ReactElement<TabProps>[];
}

const Tabs: React.FC<TabsProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(children[0].props.label);

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {children.map((child) => (
            <button
              key={child.props.label}
              onClick={() => setActiveTab(child.props.label)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === child.props.label
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
            >
              {child.props.label}
            </button>
          ))}
        </nav>
      </div>
      {
        children.map((child) => {
          if (child.props.label === activeTab) {
            return <div key={child.props.label}>{child.props.children}</div>;
          }
          return null;
        })
      }
    </div>
  );
};

const ListManager: React.FC<{ title: string; list: any[]; onAdd: (item: string) => void; onDelete: (item: string) => void; getItemName?: (item: any) => string }> = ({ title, list, onAdd, onDelete, getItemName }) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <div className="mt-2 flex space-x-2">
        <input
          type="text"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`Nuevo ${title.slice(0, -1)}`}
        />
        <button
          onClick={handleAdd}
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Agregar
        </button>
      </div>
      <ul className="mt-4 border border-gray-200 rounded-md divide-y divide-gray-200">
        {list.map((item, index) => (
          <li key={getItemName ? getItemName(item) : item} className="px-4 py-3 flex items-center justify-between text-sm text-gray-900">
            {getItemName ? getItemName(item) : item}
            <button
              onClick={() => onDelete(getItemName ? getItemName(item) : item)}
              className="text-red-600 hover:text-red-900"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function ConfiguracionPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    accountGroups,
    accountCategories,

    addAccountGroup,
    deleteAccountGroup,
    addAccountCategory,
    deleteAccountCategory,
    accounts,
    addAccount,
    deleteAccount,
    getAccountBalance, // Importar getAccountBalance
  } = useFinanzasStore();

  const [newAccount, setNewAccount] = useState<Omit<Account, 'id'>>({
    name: '',
    initialAmount: 0,
    date: new Date().toISOString().split('T')[0],
    currency: 'ARS',
    groupId: accountGroups[0] || '',
    categoryId: accountCategories[0] || '',
  });

  const handleAddAccount = () => {
    if (newAccount.name && newAccount.initialAmount >= 0 && newAccount.groupId && newAccount.categoryId) {
      addAccount(newAccount);
      setNewAccount({
        name: '',
        initialAmount: 0,
        date: new Date().toISOString().split('T')[0],
        currency: 'ARS',
        groupId: accountGroups[0] || '',
        categoryId: accountCategories[0] || '',
      });
    }
  };

  if (!mounted) {
    return null; // O un spinner
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>
      <Tabs>

        <Tab label="Grupos de Cuenta">
          <ListManager
            title="Grupos de Cuenta"
            list={accountGroups}
            onAdd={addAccountGroup}
            onDelete={deleteAccountGroup}
          />
        </Tab>
        <Tab label="Categorías de Cuenta">
          <ListManager
            title="Categorías de Cuenta"
            list={accountCategories}
            onAdd={addAccountCategory}
            onDelete={deleteAccountCategory}
          />
        </Tab>
        <Tab label="Cuentas">
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900">Administrar Cuentas</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-700">Nombre de la Cuenta</label>
                <input
                  type="text"
                  id="accountName"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="initialAmount" className="block text-sm font-medium text-gray-700">Monto Inicial</label>
                <input
                  type="number"
                  id="initialAmount"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newAccount.initialAmount}
                  onChange={(e) => setNewAccount({ ...newAccount, initialAmount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label htmlFor="accountDate" className="block text-sm font-medium text-gray-700">Fecha</label>
                <input
                  type="date"
                  id="accountDate"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newAccount.date}
                  onChange={(e) => setNewAccount({ ...newAccount, date: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="accountCurrency" className="block text-sm font-medium text-gray-700">Moneda</label>
                <select
                  id="accountCurrency"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value as 'ARS' | 'USD' })}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label htmlFor="accountGroup" className="block text-sm font-medium text-gray-700">Grupo</label>
                <select
                  id="accountGroup"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newAccount.groupId}
                  onChange={(e) => setNewAccount({ ...newAccount, groupId: e.target.value })}
                >
                  {accountGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="accountCategory" className="block text-sm font-medium text-gray-700">Categoría</label>
                <select
                  id="accountCategory"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={newAccount.categoryId}
                  onChange={(e) => setNewAccount({ ...newAccount, categoryId: e.target.value })}
                >
                  {accountCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddAccount}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Agregar Cuenta
              </button>
            </div>

            <div className="mt-8">
              <h4 className="text-md font-medium text-gray-900">Cuentas Existentes</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moneda</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Inicial</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Actual</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">Eliminar</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.currency}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.initialAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{getAccountBalance(account.id).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.groupId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.categoryId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => deleteAccount(account.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>

  );
}
