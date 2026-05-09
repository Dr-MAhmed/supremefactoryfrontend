import { useEffect, useState } from 'react';
import api from '../lib/api';

interface LedgerEntry {
  id: string;
  date: string;
  voucherType: string;
  voucherId: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export default function Ledger() {
  const [activeTab, setActiveTab] = useState<'account' | 'party'>('account');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchAccounts();
    fetchParties();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchLedger(selectedId, activeTab);
    }
  }, [selectedId, activeTab]);

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const fetchParties = async () => {
    try {
      const { data } = await api.get('/parties');
      setParties(data);
    } catch (error) {
      console.error('Failed to fetch parties', error);
    }
  };

  const fetchLedger = async (id: string, type: 'account' | 'party') => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/ledger/${type}/${id}`);
      setEntries(data.entries || []);
      setClosingBalance(data.closingBalance || 0);
    } catch (error) {
      console.error(`Failed to fetch ${type} ledger`, error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Ledger</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View account and party transactions</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
        <div className="mb-4 flex gap-4">
          {['account', 'party'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setSelectedId('');
                setEntries([]);
              }}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {tab === 'account' ? 'By Account' : 'By Party'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select {activeTab === 'account' ? 'Account' : 'Party'}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="">Select {activeTab === 'account' ? 'Account' : 'Party'}</option>
            {(activeTab === 'account' ? accounts : parties).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 dark:text-slate-400">Loading ledger...</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400">Select a {activeTab} to view transactions</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Voucher</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Debit</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Credit</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(e.date).toLocaleDateString('en-PK')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-navy dark:text-white">{e.voucherId}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{e.description}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">{e.debit > 0 ? formatCurrency(e.debit) : '-'}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">{e.credit > 0 ? formatCurrency(e.credit) : '-'}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-navy dark:text-white">{formatCurrency(e.runningBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Closing Balance</p>
              <p className="text-2xl font-semibold text-navy dark:text-white">{formatCurrency(closingBalance)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}