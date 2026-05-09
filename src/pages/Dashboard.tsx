import { useEffect, useState } from 'react';
import api from '../lib/api';

interface DashboardData {
  totalSales: number;
  totalPurchases: number;
  totalReceivable: number;
  totalPayable: number;
  netProfit: number;
  cashInHand: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    account: string;
    party?: string;
  }>;
  topCustomers: Array<{
    name: string;
    total: number;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-navy/20 border-t-navy dark:border-navy/40"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-500 dark:text-slate-400">Failed to load data</p>
          <button className="mt-4 rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString('en-PK')}`;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 transition-all group-hover:scale-150"></div>
          <div className="relative">
            <div className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Sales</div>
            <div className="mt-2 text-2xl font-bold text-navy dark:text-white md:text-3xl">{formatCurrency(data.totalSales)}</div>
            <div className="mt-4 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              <span>12.5% from last month</span>
            </div>
          </div>
        </div>

        <div className="stat-card group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-rose-500/10 transition-all group-hover:scale-150"></div>
          <div className="relative">
            <div className="text-xs font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Purchases</div>
            <div className="mt-2 text-2xl font-bold text-navy dark:text-white md:text-3xl">{formatCurrency(data.totalPurchases)}</div>
            <div className="mt-4 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span>8.2% from last month</span>
            </div>
          </div>
        </div>

        <div className="stat-card group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 transition-all group-hover:scale-150"></div>
          <div className="relative">
            <div className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Receivable</div>
            <div className="mt-2 text-2xl font-bold text-navy dark:text-white md:text-3xl">{formatCurrency(data.totalReceivable)}</div>
            <div className="mt-4 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              <span>Pending collection</span>
            </div>
          </div>
        </div>

        <div className="stat-card group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-500/10 transition-all group-hover:scale-150"></div>
          <div className="relative">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">Payable</div>
            <div className="mt-2 text-2xl font-bold text-navy dark:text-white md:text-3xl">{formatCurrency(data.totalPayable)}</div>
            <div className="mt-4 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span>Due payments</span>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Profit</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400 md:text-3xl">{formatCurrency(data.netProfit)}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10M6 20V4M18 20v-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Cash in Hand</div>
              <div className="mt-1 text-2xl font-bold text-navy dark:text-white md:text-3xl">{formatCurrency(data.cashInHand)}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/10 dark:bg-navy/30">
              <svg className="h-6 w-6 text-navy dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <h2 className="text-lg font-semibold text-navy dark:text-white">Top Customers</h2>
          <div className="mt-4 space-y-3">
            {data.topCustomers.slice(0, 3).map((customer, index) => (
              <div key={index} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition-all hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-navy to-slate-700 text-white text-sm font-semibold">
                    {customer.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{customer.name}</span>
                </div>
                <span className="text-sm font-semibold text-navy dark:text-white">{formatCurrency(customer.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="stat-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy dark:text-white">Recent Transactions</h2>
          <button className="text-sm font-medium text-navy hover:underline dark:text-white">View All</button>
        </div>
        
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</th>
                <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Account</th>
                <th className="py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{transaction.description || 'Transaction'}</div>
                    {transaction.party && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{transaction.party}</div>
                    )}
                  </td>
                  <td className="py-4 text-sm text-slate-600 dark:text-slate-400">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-sm text-slate-600 dark:text-slate-400">{transaction.account}</td>
                  <td className="py-4 text-right">
                    {transaction.debit > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                        Dr {formatCurrency(transaction.debit)}
                      </span>
                    )}
                    {transaction.credit > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 19V5M5 12l7-7 7 7" />
                        </svg>
                        Cr {formatCurrency(transaction.credit)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}