import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../components/AuthContext';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']).default('ACCOUNTANT')
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateUserForm>({ resolver: zodResolver(createUserSchema) });

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreateUserForm) => {
    try {
      await api.post('/users', data);
      showToast('User created successfully', 'success');
      reset();
      setShowForm(false);
      await fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const deactivateUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Deactivate ${userName}?`)) return;
    try {
      await api.delete(`/users/${userId}`);
      showToast('User deactivated', 'success');
      await fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to deactivate user', 'error');
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-400">Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Create and manage system users</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-navy px-6 py-2 font-semibold text-white hover:bg-[#163752] transition"
        >
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">Create New User</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="User name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="user@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <input
                  {...register('password')}
                  type="password"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Minimum 6 characters"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select
                  {...register('role')}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-navy py-2 font-semibold text-white hover:bg-[#163752] disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800/90">
          <p className="text-slate-500 dark:text-slate-400">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-dark-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Last Login</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-3 text-sm text-slate-900 dark:text-white">{u.name}</td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      u.role === 'ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      u.role === 'ACCOUNTANT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {currentUser?.id !== u.id && u.isActive && (
                      <button
                        onClick={() => deactivateUser(u.id, u.name)}
                        className="font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Deactivate
                      </button>
                    )}
                    {!u.isActive && (
                      <span className="text-gray-400 dark:text-slate-500">Deactivated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}