import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../components/ToastProvider';
import { usePermissions } from '../hooks/usePermissions';
import ViewOnlyNotice from '../components/ViewOnlyNotice';

interface Party {
  id: string;
  type: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  creditLimit: number;
  isActive: boolean;
}

const partySchema = z.object({
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  name: z.string().min(3, 'Party name must be at least 3 characters'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  city: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'Credit limit must be 0 or greater')
});

type PartyFormValues = z.infer<typeof partySchema>;

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
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
  } = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      type: 'CUSTOMER',
      name: '',
      email: '',
      phone: '',
      city: '',
      creditLimit: 0
    }
  });

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/parties');
      setParties(data);
    } catch (error) {
      console.error('Failed to fetch parties', error);
      showToast('Failed to load parties', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value);
  };

  const editParty = (party: Party) => {
    setEditingParty(party);
    setValue('type', party.type as any);
    setValue('name', party.name);
    setValue('email', party.email || '');
    setValue('phone', party.phone || '');
    setValue('city', party.city || '');
    setValue('creditLimit', party.creditLimit);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingParty(null);
    reset();
    setShowForm(false);
  };

  const onSubmit = async (values: PartyFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingParty) {
        await api.put(`/parties/${editingParty.id}`, {
          ...values,
          email: values.email || null,
          phone: values.phone || null,
          city: values.city || null
        });
        showToast('Party updated successfully', 'success');
      } else {
        await api.post('/parties', {
          ...values,
          email: values.email || null,
          phone: values.phone || null,
          city: values.city || null
        });
        showToast('Party created successfully', 'success');
      }
      reset();
      setEditingParty(null);
      setShowForm(false);
      await fetchParties();
    } catch (error: any) {
      console.error('Failed to save party', error);
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${editingParty ? 'update' : 'create'} party`;
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Parties (Customers & Suppliers)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage customers and suppliers</p>
        </div>
        {canEdit ? (
          <button
            onClick={() => editingParty ? cancelEdit() : setShowForm(!showForm)}
            className="rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
          >
            {editingParty ? 'Cancel Edit' : showForm ? 'Cancel' : 'New Party'}
          </button>
        ) : (
          <ViewOnlyNotice entity="parties" />
        )}
      </div>

      {canEdit && showForm && (
        <div className="stat-card">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
            {editingParty ? 'Edit Party' : 'Create New Party'}
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <select className="input-field" {...register('type')}>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="SUPPLIER">SUPPLIER</option>
                <option value="BOTH">BOTH</option>
              </select>
              <div>
                <input
                  type="text"
                  placeholder="Party Name"
                  className="input-field"
                  {...register('name')}
                />
                {errors.name && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.name.message}</p>}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="input-field"
                  {...register('email')}
                />
                {errors.email && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>}
              </div>
              <input
                type="text"
                placeholder="Phone"
                className="input-field"
                {...register('phone')}
              />
              <input
                type="text"
                placeholder="City"
                className="input-field"
                {...register('city')}
              />
              <div>
                <input
                  type="number"
                  placeholder="Credit Limit"
                  className="input-field"
                  {...register('creditLimit')}
                />
                {errors.creditLimit && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.creditLimit.message}</p>}
              </div>
            </div>
            <button
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (editingParty ? 'Updating Party...' : 'Creating Party...') : (editingParty ? 'Update Party' : 'Create Party')}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
        {loading ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">Loading...</p>
        ) : parties.length === 0 ? (
          <p className="p-6 text-center text-slate-500 dark:text-slate-400">No parties yet</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">City</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Phone</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Credit Limit</th>
                {canEdit && <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {parties.map((p) => (
                <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm font-medium text-navy dark:text-white">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{p.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{p.city || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{p.phone || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(p.creditLimit)}</td>
                  {canEdit && (
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => editParty(p)}
                        className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        Edit
                      </button>
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