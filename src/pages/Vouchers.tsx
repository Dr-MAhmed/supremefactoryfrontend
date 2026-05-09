import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import ViewOnlyNotice from '../components/ViewOnlyNotice';

const voucherSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  entries: z.array(z.object({
    accountId: z.string().min(1, 'Account is required'),
    debit: z.number().min(0, 'Debit must be non-negative'),
    credit: z.number().min(0, 'Credit must be non-negative'),
  })).min(1, 'At least one entry is required'),
}).refine((data) => {
  const totalDebit = data.entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = data.entries.reduce((sum, entry) => sum + entry.credit, 0);
  return totalDebit === totalCredit;
}, {
  message: 'Total debits must equal total credits',
  path: ['entries'],
});

type VoucherFormData = z.infer<typeof voucherSchema>;

export default function Vouchers() {
  const [activeTab, setActiveTab] = useState<'payment' | 'receipt' | 'journal'>('journal');
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { showToast } = useToast();
  const { canEdit } = usePermissions();

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<VoucherFormData>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: '',
      entries: [{ accountId: '', debit: 0, credit: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'entries',
  });

  const watchedEntries = watch('entries');
  const totalDebit = watchedEntries?.reduce((sum, entry) => sum + (entry.debit || 0), 0) || 0;
  const totalCredit = watchedEntries?.reduce((sum, entry) => sum + (entry.credit || 0), 0) || 0;

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const onSubmit = async (data: VoucherFormData) => {
    try {
      await api.post('/vouchers/journal', data);
      showToast('Journal voucher created successfully', 'success');
      setShowForm(false);
      reset();
    } catch (error) {
      console.error('Failed to create journal voucher', error);
      showToast('Failed to create journal voucher', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Vouchers</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Payment, receipt, and journal vouchers</p>
        </div>
        {canEdit ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
          >
            {showForm ? 'Cancel' : 'New Voucher'}
          </button>
        ) : (
          <ViewOnlyNotice entity="vouchers" />
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {['payment', 'receipt', 'journal'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab ? 'border-b-2 border-navy text-navy dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'payment' ? 'Payment' : tab === 'receipt' ? 'Receipt' : 'Journal'}
            </button>
          ))}
        </div>

        {canEdit && showForm && (
          <div className="border-b border-slate-200 p-6 dark:border-slate-700">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                  <input
                    {...register('date')}
                    type="date"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                  <input
                    {...register('description')}
                    type="text"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">Journal Entries</h3>
                  <button
                    type="button"
                    onClick={() => append({ accountId: '', debit: 0, credit: 0 })}
                    className="rounded-2xl bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    Add Entry
                  </button>
                </div>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Account</label>
                        <select
                          {...register(`entries.${index}.accountId`)}
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                        >
                          <option value="">Select Account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        {errors.entries?.[index]?.accountId && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entries[index].accountId.message}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Debit</label>
                        <input
                          {...register(`entries.${index}.debit`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                        />
                        {errors.entries?.[index]?.debit && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entries[index].debit.message}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Credit</label>
                        <input
                          {...register(`entries.${index}.credit`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                        />
                        {errors.entries?.[index]?.credit && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entries[index].credit.message}</p>
                        )}
                      </div>
                      <div className="col-span-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {(watchedEntries?.[index]?.debit || 0) - (watchedEntries?.[index]?.credit || 0)}
                        </p>
                      </div>
                      <div className="col-span-1">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="rounded-2xl bg-red-100 px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.entries && typeof errors.entries.message === 'string' && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.entries.message}</p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="dark:text-slate-300">Total Debit:</span>
                  <span className="dark:text-slate-100">{totalDebit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="dark:text-slate-300">Total Credit:</span>
                  <span className="dark:text-slate-100">{totalCredit.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold dark:border-slate-600">
                  <span className="dark:text-slate-300">Difference:</span>
                  <span className={totalDebit === totalCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {(totalDebit - totalCredit).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
              >
                Create Journal Voucher
              </button>
            </form>
          </div>
        )}

        <div className="p-6">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">No vouchers yet</p>
        </div>
      </div>
    </div>
  );
}