import { useEffect, useState, useCallback } from 'react';
import { useApiError } from '../hooks/useApiError';
import api from '../lib/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import ViewOnlyNotice from '../components/ViewOnlyNotice';
import { generateSalePDF, downloadPDF, openPDFForPrint } from '../lib/pdfGenerator';

const saleSchema = z.object({
  invoiceNo: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  partyId: z.string().min(1, 'Customer is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  discount: z.number().min(0, 'Discount must be positive'),
  tax: z.number().min(0, 'Tax must be positive'),
  subtotal: z.number().optional(),
  total: z.number().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    rate: z.number().min(0.01, 'Rate must be positive'),
  })).min(1, 'At least one item is required'),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface SaleItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  party: { id: string; name: string };
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  dueDate: string;
  items: SaleItem[];
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const { handleError } = useApiError();
  const { showToast } = useToast();
  const { canEdit } = usePermissions();

  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
      partyId: '',
      dueDate: '',
      discount: 0,
      tax: 0,
      items: [{ description: '', quantity: 1, unit: 'kg', rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedDiscount = watch('discount');
  const watchedTax = watch('tax');

  const subtotal = watchedItems?.reduce((sum, item) => sum + (item.quantity * item.rate), 0) || 0;
  const discountAmount = (subtotal * (watchedDiscount || 0)) / 100;
  const taxAmount = ((subtotal - discountAmount) * (watchedTax || 0)) / 100;
  const total = subtotal - discountAmount + taxAmount;

  useEffect(() => {
    fetchSales();
    fetchParties();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sales');
      setSales(data);
    } catch (error: any) {
      handleError(error, 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const { data } = await api.get('/parties');
      setParties(data);
    } catch (error: any) {
      handleError(error, 'Failed to load customers');
    }
  };

  const editSale = (sale: Sale) => {
    setEditingSale(sale);
    setValue('invoiceNo', sale.invoiceNo);
    setValue('date', sale.date.split('T')[0]);
    setValue('partyId', sale.party.id);
    setValue('dueDate', sale.dueDate.split('T')[0]);
    setValue('discount', sale.discount);
    setValue('tax', sale.tax);
    setValue('items', sale.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate
    })));
    setShowForm(true);
  };

  const openStatusModal = (sale: Sale) => {
    setSelectedSale(sale);
    setShowStatusModal(true);
  }; 

  const updateStatus = async (status: string, receivedAmount?: number) => {
    if (!selectedSale) return;
    try {
      await api.patch(`/sales/${selectedSale.id}/status`, { paymentStatus: status, receivedAmount });
      showToast('Status updated successfully', 'success');
      setShowStatusModal(false);
      setSelectedSale(null);
      await fetchSales();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const cancelEdit = () => {
    setEditingSale(null);
    reset();
    setShowForm(false);
  };

  const onSubmit = async (data: SaleFormData) => {
    try {
      const payload = {
        ...data,
        subtotal,
        total,
        items: data.items.map(item => ({
          ...item,
          amount: item.quantity * item.rate,
        })),
      };
      if (editingSale) {
        await api.put(`/sales/${editingSale.id}`, payload);
        showToast('Sale updated successfully', 'success');
      } else {
        await api.post('/sales', payload);
        showToast('Sale created successfully', 'success');
      }
      setEditingSale(null);
      setShowForm(false);
      reset();
      fetchSales();
    } catch (error: any) {
      handleError(error, `Failed to ${editingSale ? 'update' : 'create'} sale`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value);
  };

  const handlePDFDownload = useCallback((s: Sale) => {
    const doc = generateSalePDF({
      invoiceNo: s.invoiceNo,
      date: s.date,
      dueDate: s.dueDate,
      customer: s.party.name,
      subtotal: s.subtotal,
      discount: s.discount,
      tax: s.tax,
      total: s.total,
      paymentStatus: s.paymentStatus,
      items: s.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    });
    downloadPDF(doc, `Sale_Invoice_${s.invoiceNo}.pdf`);
  }, []);

  const handlePDFPrint = useCallback((s: Sale) => {
    const doc = generateSalePDF({
      invoiceNo: s.invoiceNo,
      date: s.date,
      dueDate: s.dueDate,
      customer: s.party.name,
      subtotal: s.subtotal,
      discount: s.discount,
      tax: s.tax,
      total: s.total,
      paymentStatus: s.paymentStatus,
      items: s.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    });
    openPDFForPrint(doc, `Sale Invoice #${s.invoiceNo}`);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sales Invoices</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create and manage customer invoices</p>
        </div>
        {canEdit ? (
          <button
            onClick={() => editingSale ? cancelEdit() : setShowForm(!showForm)}
            className="rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
          >
            {editingSale ? 'Cancel Edit' : showForm ? 'Cancel' : 'New Sale'}
          </button>
        ) : (
          <ViewOnlyNotice entity="sales invoices" />
        )}
      </div>

      {canEdit && showForm && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
            {editingSale ? 'Edit Sale' : 'Create New Sale'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Invoice No</label>
                <div className="flex items-center gap-2">
                  <input
                    {...register('invoiceNo')}
                    type="text"
                    readOnly={!editingSale}
                    className={`mt-1 w-full rounded-2xl border px-4 py-2 text-sm ${editingSale ? 'border-slate-200' : 'border-slate-300 bg-slate-50 cursor-not-allowed'}`}
                    placeholder={editingSale ? '' : 'Auto-generated on save'}
                  />
                  {!editingSale && (
                    <span className="text-xs text-slate-500">(Auto)</span>
                  )}
                </div>
                {errors.invoiceNo && <p className="mt-1 text-sm text-red-600">{errors.invoiceNo.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Date</label>
                <input
                  {...register('date')}
                  type="date"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Customer</label>
                <select
                  {...register('partyId')}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                >
                  <option value="">Select Customer</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
                {errors.partyId && <p className="mt-1 text-sm text-red-600">{errors.partyId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Due Date</label>
                <input
                  {...register('dueDate')}
                  type="date"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Items</h3>
                <button
                  type="button"
                  onClick={() => append({ description: '', quantity: 1, unit: 'kg', rate: 0 })}
                  className="rounded-2xl bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-slate-700">Description</label>
                      <input
                        {...register(`items.${index}.description`)}
                        type="text"
                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index].description.message}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Quantity</label>
                      <input
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index].quantity.message}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Unit</label>
                      <input
                        {...register(`items.${index}.unit`)}
                        type="text"
                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                      />
                      {errors.items?.[index]?.unit && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index].unit.message}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700">Rate</label>
                      <input
                        {...register(`items.${index}.rate`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                      />
                      {errors.items?.[index]?.rate && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index].rate.message}</p>
                      )}
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency((watchedItems?.[index]?.quantity || 0) * (watchedItems?.[index]?.rate || 0))}
                      </p>
                    </div>
                    <div className="col-span-1">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded-2xl bg-red-100 px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Discount (%)</label>
                <input
                  {...register('discount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                {errors.discount && <p className="mt-1 text-sm text-red-600">{errors.discount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tax (%)</label>
                <input
                  {...register('tax', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                />
                {errors.tax && <p className="mt-1 text-sm text-red-600">{errors.tax.message}</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
            >
              {editingSale ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
        {loading ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</p>
        ) : sales.length === 0 ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">No sales yet</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Status</th>
                {canEdit && <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm font-medium text-navy dark:text-white">{s.invoiceNo}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{s.party.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(s.date).toLocaleDateString('en-PK')}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-PK') : '-'}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(s.total)}</td>
                  <td>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        s.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : s.paymentStatus === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.paymentStatus}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => editSale(s)}
                          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openStatusModal(s)}
                          className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
                        >
                          Status
                        </button>
                        <button
                          onClick={() => handlePDFDownload(s)}
                          className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handlePDFPrint(s)}
                          className="rounded-lg bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-200"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

        {showStatusModal && selectedSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Update Payment Status</h2>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Invoice: {selectedSale.invoiceNo}</p>
                  <p className="text-sm text-slate-500">Total: {formatCurrency(selectedSale.total)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <div className="relative">
                    <select 
                      onChange={(e) => updateStatus(e.target.value as string)}
                      defaultValue={selectedSale.paymentStatus}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm appearance-none bg-white"
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
                  <label className="block text-sm font-medium mb-2">Received Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={0}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      updateStatus(selectedSale.paymentStatus, value);
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
