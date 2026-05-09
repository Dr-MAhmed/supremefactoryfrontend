import { useEffect, useState, useCallback } from 'react';
import { useApiError } from '../hooks/useApiError';
import api from '../lib/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import ViewOnlyNotice from '../components/ViewOnlyNotice';
import { generatePurchaseReturnPDF, downloadPDF, openPDFForPrint } from '../lib/pdfGenerator';

interface PurchaseReturnItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface Purchase {
  id: string;
  voucherNo: string;
}

interface PurchaseReturn {
  id: string;
  voucherNo: string;
  date: string;
  party: { id: string; name: string };
  purchase: { id: string; voucherNo: string } | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  reason: string;
  items: PurchaseReturnItem[];
}

interface Party {
  id: string;
  name: string;
  type: string;
}

const returnItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.coerce.number().nonnegative('Rate must be non-negative'),
  amount: z.coerce.number().nonnegative('Amount must be non-negative')
});

const purchaseReturnSchema = z.object({
  partyId: z.string().min(1, 'Supplier is required'),
  purchaseId: z.string().optional(),
  items: z.array(returnItemSchema).min(1, 'At least one item is required'),
  discount: z.coerce.number().min(0, 'Discount must be 0 or greater'),
  tax: z.coerce.number().min(0, 'Tax must be 0 or greater'),
  subtotal: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  reason: z.string().optional(),
  remarks: z.string().optional()
});

type PurchaseReturnFormValues = z.infer<typeof purchaseReturnSchema>;

export default function PurchaseReturns() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const { handleError } = useApiError();
  const { showToast } = useToast();
  const { canEdit } = usePermissions();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<PurchaseReturnFormValues>({
    resolver: zodResolver(purchaseReturnSchema),
    defaultValues: {
      partyId: '',
      purchaseId: '',
      items: [{ description: '', quantity: 1, unit: '', rate: 0, amount: 0 }],
      discount: 0,
      tax: 0,
      reason: '',
      remarks: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');
  const watchedDiscount = watch('discount');
  const watchedTax = watch('tax');

  useEffect(() => {
    fetchReturns();
    fetchParties();
    fetchPurchases();
  }, []);

  useEffect(() => {
    const subtotal = watchedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const total = subtotal - (watchedDiscount || 0) + (watchedTax || 0);
    setValue('subtotal', subtotal);
    setValue('total', total);
  }, [watchedItems, watchedDiscount, watchedTax, setValue]);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchase-returns');
      setReturns(data);
    } catch (error: any) {
      handleError(error, 'Failed to load purchase returns');
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const { data } = await api.get('/parties');
      setParties(data.filter((p: Party) => p.type === 'SUPPLIER' || p.type === 'BOTH'));
    } catch (error: any) {
      handleError(error, 'Failed to load suppliers');
    }
  };

  const fetchPurchases = async () => {
    try {
      const { data } = await api.get('/purchases');
      setPurchases(data);
    } catch (error: any) {
      handleError(error, 'Failed to load purchases');
    }
  };

  const editReturn = (purchaseReturn: PurchaseReturn) => {
    setEditingReturn(purchaseReturn);
    setValue('partyId', purchaseReturn.party.id);
    setValue('purchaseId', purchaseReturn.purchase?.id || '');
    setValue('items', purchaseReturn.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      amount: item.amount
    })));
    setValue('discount', purchaseReturn.discount);
    setValue('tax', purchaseReturn.tax);
    setValue('reason', purchaseReturn.reason || '');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingReturn(null);
    reset();
    setShowForm(false);
  };

  const onSubmit = async (values: PurchaseReturnFormValues) => {
    setIsSubmitting(true);
    try {
      const itemsWithAmount = values.items.map((item) => ({
        ...item,
        amount: (item.quantity || 0) * (item.rate || 0)
      }));
      const subtotal = itemsWithAmount.reduce((sum, item) => sum + (item.amount || 0), 0);
      const total = subtotal - (values.discount || 0) + (values.tax || 0);

      const payload = {
        ...values,
        items: itemsWithAmount,
        subtotal,
        total
      };

      if (editingReturn) {
        await api.put(`/purchase-returns/${editingReturn.id}`, payload);
        showToast('Purchase return updated successfully', 'success');
      } else {
        await api.post('/purchase-returns', payload);
        showToast('Purchase return created successfully', 'success');
      }
      reset();
      setEditingReturn(null);
      setShowForm(false);
      await fetchReturns();
    } catch (error: any) {
      handleError(error, `Failed to ${editingReturn ? 'update' : 'create'} purchase return`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `PKR ${value.toLocaleString('en-PK')}`;
  };

  const handlePDFDownload = useCallback((r: PurchaseReturn) => {
    const doc = generatePurchaseReturnPDF({
      voucherNo: r.voucherNo,
      date: r.date,
      party: r.party.name,
      referenceNo: r.purchase?.voucherNo,
      subtotal: r.subtotal,
      discount: r.discount,
      tax: r.tax,
      total: r.total,
      reason: r.reason,
      items: r.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    });
    downloadPDF(doc, `Purchase_Return_${r.voucherNo}.pdf`);
  }, []);

  const handlePDFPrint = useCallback((r: PurchaseReturn) => {
    const doc = generatePurchaseReturnPDF({
      voucherNo: r.voucherNo,
      date: r.date,
      party: r.party.name,
      referenceNo: r.purchase?.voucherNo,
      subtotal: r.subtotal,
      discount: r.discount,
      tax: r.tax,
      total: r.total,
      reason: r.reason,
      items: r.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    });
    openPDFForPrint(doc, `Purchase Return #${r.voucherNo}`);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Purchase Returns</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record returns of goods to suppliers</p>
        </div>
        {canEdit ? (
          <button
            onClick={() => editingReturn ? cancelEdit() : setShowForm(!showForm)}
            className="rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
          >
            {editingReturn ? 'Cancel Edit' : showForm ? 'Cancel' : 'New Return'}
          </button>
        ) : (
          <ViewOnlyNotice entity="purchase returns" />
        )}
      </div>

      {canEdit && showForm && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
            {editingReturn ? 'Edit Purchase Return' : 'Create New Purchase Return'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <select {...register('partyId')} className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm">
                  <option value="">Select Supplier</option>
                  {parties.map(party => (
                    <option key={party.id} value={party.id}>{party.name}</option>
                  ))}
                </select>
                {errors.partyId && <p className="mt-1 text-xs text-rose-600">{errors.partyId.message}</p>}
              </div>
              <div>
                <select {...register('purchaseId')} className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm">
                  <option value="">Select Original Purchase (Optional)</option>
                  {purchases.map(p => (
                    <option key={p.id} value={p.id}>{p.voucherNo}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-700">Items</h3>
                <button
                  type="button"
                  onClick={() => append({ description: '', quantity: 1, unit: '', rate: 0, amount: 0 })}
                  className="text-xs text-navy hover:underline"
                >
                  + Add Item
                </button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <input
                      {...register(`items.${index}.description`)}
                      placeholder="Description"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      onChange={(e) => {
                        const qty = parseFloat(e.target.value) || 0;
                        const rate = watchedItems[index]?.rate || 0;
                        setValue(`items.${index}.amount`, qty * rate);
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${index}.unit`)}
                      placeholder="Unit"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${index}.rate`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="Rate"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        const qty = watchedItems[index]?.quantity || 0;
                        setValue(`items.${index}.amount`, qty * rate);
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${index}.amount`)}
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                      readOnly
                    />
                  </div>
                  <div className="col-span-1">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  {...register('reason')}
                  placeholder="Reason for return (optional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <input
                  {...register('remarks')}
                  placeholder="Remarks (optional)"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Discount</label>
                <input
                  {...register('discount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tax (GST)</label>
                <input
                  {...register('tax', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Total</label>
                <input
                  value={formatCurrency(watchedItems.reduce((sum, item) => sum + (item.amount || 0), 0) - (watchedDiscount || 0) + (watchedTax || 0))}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm bg-slate-50"
                />
              </div>
            </div>

            <button
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (editingReturn ? 'Updating Return...' : 'Creating Return...') : (editingReturn ? 'Update Return' : 'Create Return')}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
        {loading ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</p>
        ) : returns.length === 0 ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">No purchase returns yet</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Voucher #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Ref. Purchase</th>
                {canEdit && <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm font-medium text-navy dark:text-white">{r.voucherNo}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{r.party.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(r.date).toLocaleDateString('en-PK')}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(r.total)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{r.reason || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{r.purchase?.voucherNo || '-'}</td>
                  {canEdit && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => editReturn(r)}
                          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handlePDFDownload(r)}
                          className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handlePDFPrint(r)}
                          className="rounded-lg bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-200"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}