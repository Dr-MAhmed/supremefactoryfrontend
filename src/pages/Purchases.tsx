import { useEffect, useState, useCallback } from 'react';
import { useApiError } from '../hooks/useApiError';
import api from '../lib/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import ViewOnlyNotice from '../components/ViewOnlyNotice';
import { generatePurchasePDF, downloadPDF, openPDFForPrint } from '../lib/pdfGenerator';

interface PurchaseItem {
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
  date: string;
  party: { id: string; name: string };
  supplierInvoiceNo: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  items: PurchaseItem[];
}

interface Party {
  id: string;
  name: string;
  type: string;
}

const purchaseItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.coerce.number().nonnegative('Rate must be non-negative'),
  amount: z.coerce.number().nonnegative('Amount must be non-negative')
});

const purchaseSchema = z.object({
  partyId: z.string().min(1, 'Supplier is required'),
  supplierInvoiceNo: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  discount: z.coerce.number().min(0, 'Discount must be 0 or greater'),
  tax: z.coerce.number().min(0, 'Tax must be 0 or greater'),
  subtotal: z.coerce.number().optional(),
  total: z.coerce.number().optional()
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
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
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      partyId: '',
      supplierInvoiceNo: '',
      items: [{ description: '', quantity: 1, unit: '', rate: 0, amount: 0 }],
      discount: 0,
      tax: 0
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
    fetchPurchases();
    fetchParties();
  }, []);

  useEffect(() => {
    const subtotal = watchedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const total = subtotal - (watchedDiscount || 0) + (watchedTax || 0);
    setValue('subtotal', subtotal);
    setValue('total', total);
  }, [watchedItems, watchedDiscount, watchedTax, setValue]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchases');
      setPurchases(data);
    } catch (error: any) {
      handleError(error, 'Failed to load purchases');
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

  const editPurchase = (purchase: Purchase) => {   
    setEditingPurchase(purchase);  
    setValue('partyId', purchase.party.id);    
    setValue('supplierInvoiceNo', purchase.supplierInvoiceNo || '');  
    setValue('items', purchase.items.map(item => ({      
      description: item.description,      
      quantity: item.quantity,      
      unit: item.unit,      
      rate: item.rate,      
      amount: item.amount    
    })));    
    setValue('discount', purchase.discount);    
    setValue('tax', purchase.tax);    
    setShowForm(true);  
  };  

  const openStatusModal = (purchase: Purchase) => {    
    setSelectedPurchase(purchase);    
    setShowStatusModal(true);  
  };  

  const updateStatus = async (status: string, paidAmount?: number) => {    
    if (!selectedPurchase) return;    
    try {      
      await api.patch(`/purchases/${selectedPurchase.id}/status`, { paymentStatus: status, paidAmount });      
      showToast('Status updated successfully', 'success');      
      setShowStatusModal(false);      
      setSelectedPurchase(null);      
      await fetchPurchases();    
    } catch (error: any) {      
      handleError(error, 'Failed to update status');    
    }  
  };

  const cancelEdit = () => {
    setEditingPurchase(null);
    reset();
    setShowForm(false);
  };

  const onSubmit = async (values: PurchaseFormValues) => {
    setIsSubmitting(true);
    try {
      // Recalculate item amounts and totals based on submitted values
      const itemsWithAmount = values.items.map((item) => ({
        ...item,
        amount: (item.quantity || 0) * (item.rate || 0)
      }));
      const subtotal = itemsWithAmount.reduce((sum, item) => sum + (item.amount || 0), 0);
      const total = subtotal - (values.discount || 0) + (values.tax || 0);
      // Build payload for create or update
      const basePayload = {
        ...values,
        items: itemsWithAmount,
        subtotal,
        total
      };
      const payload = editingPurchase
        ? {
            ...basePayload,
            // Preserve fields that aren't edited via the form but required by the API
            voucherNo: editingPurchase.voucherNo,
            date: editingPurchase.date,
            paymentStatus: editingPurchase.paymentStatus
          }
        : basePayload;
      if (editingPurchase) {
      await api.put(`/purchases/${editingPurchase.id}`, payload);
        showToast('Purchase updated successfully', 'success');
      } else {
        await api.post('/purchases', payload);
        showToast('Purchase created successfully', 'success');
      }
      reset();
      setEditingPurchase(null);
      setShowForm(false);
      await fetchPurchases();
    } catch (error: any) {
      handleError(error, `Failed to ${editingPurchase ? 'update' : 'create'} purchase`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `PKR ${value.toLocaleString('en-PK')}`;
  };

  const handlePDFDownload = useCallback((p: Purchase) => {
    const doc = generatePurchasePDF({
      voucherNo: p.voucherNo,
      date: p.date,
      supplier: p.party.name,
      supplierInvoiceNo: p.supplierInvoiceNo,
      subtotal: p.subtotal,
      discount: p.discount,
      tax: p.tax,
      total: p.total,
      paymentStatus: p.paymentStatus,
      items: p.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    });
    downloadPDF(doc, `Purchase_Voucher_${p.voucherNo}.pdf`);
  }, []);

  const handlePDFPrint = useCallback((p: Purchase) => {
    const doc = generatePurchasePDF({
      voucherNo: p.voucherNo,
      date: p.date,
      supplier: p.party.name,
      supplierInvoiceNo: p.supplierInvoiceNo,
      subtotal: p.subtotal,
      discount: p.discount,
      tax: p.tax,
      total: p.total,
      paymentStatus: p.paymentStatus,
      items: p.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    });
    openPDFForPrint(doc, `Purchase Voucher #${p.voucherNo}`);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Purchase Vouchers</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record and manage supplier purchases</p>
        </div>
        {canEdit ? (
          <button
            onClick={() => editingPurchase ? cancelEdit() : setShowForm(!showForm)}
            className="rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
          >
            {editingPurchase ? 'Cancel Edit' : showForm ? 'Cancel' : 'New Purchase'}
          </button>
        ) : (
          <ViewOnlyNotice entity="purchases" />
        )}
      </div>

      {canEdit && showForm && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
            {editingPurchase ? 'Edit Purchase' : 'Create New Purchase'}
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
                <input
                  type="text"
                  {...register('supplierInvoiceNo')}
                  readOnly={!editingPurchase}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm ${editingPurchase ? 'border-slate-200' : 'border-slate-300 bg-slate-50 cursor-not-allowed'}`}
                  placeholder={!editingPurchase ? 'Auto-generated on save' : 'Supplier Invoice #'}
                />
                {!editingPurchase && (
                  <span className="text-xs text-slate-500 block mt-1">(Auto)</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Items</h3>
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
              {isSubmitting ? (editingPurchase ? 'Updating Purchase...' : 'Creating Purchase...') : (editingPurchase ? 'Update Purchase' : 'Create Purchase')}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
        {loading ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</p>
        ) : purchases.length === 0 ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">No purchases yet</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Voucher #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Status</th>
                {canEdit && <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm font-medium text-navy dark:text-white">{p.voucherNo}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{p.party.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(p.date).toLocaleDateString('en-PK')}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(p.total)}</td>
                  <td>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        p.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : p.paymentStatus === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.paymentStatus}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => editPurchase(p)}
                          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openStatusModal(p)}
                          className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => handlePDFDownload(p)}
                          className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handlePDFPrint(p)}
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

        {showStatusModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold dark:text-white">Update Payment Status</h2>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Voucher: {selectedPurchase.voucherNo}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total: {formatCurrency(selectedPurchase.total)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-slate-300">Status</label>
                  <div className="relative">
                    <select 
                      onChange={(e) => updateStatus(e.target.value as string)}
                      defaultValue={selectedPurchase.paymentStatus}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm appearance-none bg-white dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="UNPAID">Unpaid</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                      ▼
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-slate-300">Paid Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={0}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      updateStatus(selectedPurchase.paymentStatus, value);
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
