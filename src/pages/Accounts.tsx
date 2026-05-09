import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import ViewOnlyNotice from '../components/ViewOnlyNotice';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

const accountSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { canEdit } = usePermissions();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: '',
      name: '',
      type: 'ASSET'
    }
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts', error);
      showToast('Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const editAccount = (account: Account) => {
    setEditingAccount(account);
    setValue('code', account.code);
    setValue('name', account.name);
    setValue('type', account.type as any);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingAccount(null);
    reset();
    setShowForm(false);
  };

  const toggleAccountStatus = async (account: Account) => {
    try {
      await api.patch(`/accounts/${account.id}/status`, { isActive: !account.isActive });
      showToast('Account status updated successfully', 'success');
      await fetchAccounts();
      if (editingAccount?.id === account.id) {
        setEditingAccount({ ...account, isActive: !account.isActive });
      }
    } catch (error: any) {
      console.error('Failed to update account status', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update account status';
      showToast(errorMessage, 'error');
    }
  };

  const onSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingAccount) {
        await api.put(`/accounts/${editingAccount.id}`, values);
        showToast('Account updated successfully', 'success');
      } else {
        await api.post('/accounts', values);
        showToast('Account created successfully', 'success');
      }
      reset();
      setEditingAccount(null);
      setShowForm(false);
      await fetchAccounts();
    } catch (error: any) {
      console.error('Failed to save account', error);
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${editingAccount ? 'update' : 'create'} account`;
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-white">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage all ledger accounts</p>
        </div>
        {canEdit ? (
          <button
            onClick={() => editingAccount ? cancelEdit() : setShowForm(!showForm)}
            className="btn-primary"
          >
            {editingAccount ? 'Cancel Edit' : showForm ? 'Cancel' : 'New Account'}
          </button>
        ) : (
          <ViewOnlyNotice entity="accounts" />
        )}
      </div>

      {canEdit && showForm && (
      <div className="stat-card">
        <h2 className="mb-6 text-xl font-semibold text-navy dark:text-white">
            {editingAccount ? 'Edit Account' : 'Create New Account'}
        </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Account Code</label>
                <input
                  type="text"
                  placeholder="e.g., 1000"
                  className={`input-field ${errors.code ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-700' : ''}`}
                  {...register('code')}
                />
                {errors.code && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {errors.code.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g., Cash Account"
                  className={`input-field ${errors.name ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-700' : ''}`}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Account Type</label>
                <select
                  className="input-field"
                  {...register('type')}
                >
                  <option value="ASSET">ASSET - Assets</option>
                  <option value="LIABILITY">LIABILITY - Liabilities</option>
                  <option value="EQUITY">EQUITY - Equity</option>
                  <option value="REVENUE">REVENUE - Revenue</option>
                  <option value="EXPENSE">EXPENSE - Expenses</option>
                </select>
              </div>
            </div>
            <button
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" />
                  </svg>
                  {editingAccount ? 'Updating Account...' : 'Creating Account...'}
                </span>
              ) : (
                editingAccount ? 'Update Account' : 'Create Account'
              )}
            </button>
          </form>
        </div>
      )}

      <div className="stat-card overflow-hidden p-0">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-navy/20 border-t-navy dark:border-navy/40"></div>
              <p className="text-slate-500 dark:text-slate-400">Loading accounts...</p>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center p-8">
            <svg className="mb-4 h-16 w-16 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">No accounts yet</p>
            {canEdit && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 btn-primary"
              >
                Create Your First Account
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-700/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    {canEdit && <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {accounts.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-navy dark:text-white">{a.code}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{a.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {a.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          a.isActive 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            a.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                          {a.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleAccountStatus(a)}
                              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                a.isActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                              }`}
                            >
                              {a.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => editAccount(a)}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-navy hover:bg-navy/5 transition-colors dark:text-white dark:hover:bg-slate-700/50"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}