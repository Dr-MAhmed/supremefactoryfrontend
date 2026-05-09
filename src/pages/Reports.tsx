import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'trial-balance' | 'profit-loss' | 'balance-sheet' | 'outstanding' | 'sales' | 'purchases'>('trial-balance');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab]);

  
  const fetchReport = async (reportType: string) => {
    setLoading(true);
    try {
      const params: any = {};
      const { data } = await api.get(`/reports/${reportType}`, { params });
      setReportData(data);
    } catch (error) {
      console.error(`Failed to fetch ${reportType} report`, error);
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Financial Reports</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View financial statements and analysis</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
        <div className="grid grid-cols-3 gap-2 border-b border-slate-200 p-2 dark:border-slate-700 md:grid-cols-6">
          {[
            { key: 'trial-balance', label: 'Trial Balance' },
            { key: 'profit-loss', label: 'P&L' },
            { key: 'balance-sheet', label: 'Balance Sheet' },
            { key: 'outstanding', label: 'Outstanding' },
            { key: 'sales', label: 'Sales' },
            { key: 'purchases', label: 'Purchases' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`rounded-2xl px-3 py-2 text-xs font-medium transition ${
                activeTab === tab.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {(activeTab === 'sales' || activeTab === 'purchases') && (
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            {reportData && (
              <div className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Showing all records • Records: {reportData.totalRecords || 0} | Bad: {reportData.badRecords || 0}
              </div>
            )}
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <p className="text-center text-slate-500 dark:text-slate-400">Loading report...</p>
          ) : !reportData ? (
            <p className="text-center text-slate-500 dark:text-slate-400">No data available</p>
          ) : activeTab === 'trial-balance' ? (
            <div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Account</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Debit</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.accounts?.map((acc: any) => (
                    <tr key={acc.code} className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{acc.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold dark:border-slate-600 dark:bg-slate-700/50">
                    <td className="px-4 py-3 text-slate-900 dark:text-white">TOTAL</td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(reportData.totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(reportData.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Status: <span className={reportData.isBalanced ? 'font-semibold text-green-600 dark:text-green-400' : 'font-semibold text-red-600 dark:text-red-400'}>{reportData.isBalanced ? 'Balanced ✓' : 'Not Balanced ✗'}</span>
              </p>
            </div>
          ) : activeTab === 'profit-loss' ? (
            <div className="space-y-4">
              <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                <span className="font-medium text-slate-700 dark:text-slate-300">Total Revenue:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(reportData.totalRevenue)}</span>
              </div>
              <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                <span className="font-medium text-slate-700 dark:text-slate-300">Total Expense:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(reportData.totalExpense)}</span>
              </div>
              <div className="flex justify-between rounded-2xl border-2 border-navy bg-navy/5 p-4 dark:border-navy/50 dark:bg-navy/10">
                <span className="font-medium text-slate-900 dark:text-white">Net Profit/Loss:</span>
                <span className={`font-semibold ${reportData.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(reportData.netProfit)}</span>
              </div>
            </div>
          ) : activeTab === 'balance-sheet' ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Assets</h3>
                <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                  <span className="text-slate-700 dark:text-slate-300">Total Assets:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(reportData.totalAssets)}</span>
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Liabilities</h3>
                <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                  <span className="text-slate-700 dark:text-slate-300">Total Liabilities:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(reportData.totalLiabilities)}</span>
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Equity</h3>
                <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                  <span className="text-slate-700 dark:text-slate-300">Total Equity:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(reportData.totalEquity)}</span>
                </div>
              </div>
            </div>
          ) : activeTab === 'outstanding' ? (
            <div className="space-y-2 text-sm">
              {reportData?.map?.((item: any) => (
                <div key={item.partyId} className="flex justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/50">
                  <span className="text-slate-700 dark:text-slate-300">{item.partyName}</span>
                  <span className={`font-semibold ${item.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(item.balance)}</span>
                </div>
              ))}
            </div>
          ) : activeTab === 'sales' ? (
            <div className="space-y-4">
              <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                <span className="font-medium text-slate-700 dark:text-slate-300">Total Sales:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(reportData.totalSales)}</span>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">By Customer:</h3>
                {reportData.byCustomer?.map?.((c: any) => (
                  <div key={c.name} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{c.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'purchases' ? (
            <div className="space-y-4">
              <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                <span className="font-medium text-slate-700 dark:text-slate-300">Total Purchases:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(reportData.totalPurchases)}</span>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">By Supplier:</h3>
                {reportData.bySupplier?.map?.((s: any) => (
                  <div key={s.name} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{s.name}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}