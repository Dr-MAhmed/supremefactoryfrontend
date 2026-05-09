import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [companyInfo, setCompanyInfo] = useState({
    name: 'Supreme Cotton',
    address: 'Faisalabad, Pakistan',
    phone: '+92 41 1234567',
    email: 'info@supremecotton.com',
    ntn: '1234567-8'
  });

  const [editMode, setEditMode] = useState(false);
  const { showToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleSave = () => {
    console.log('Company info saved', companyInfo);
    setEditMode(false);
  };

   const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage company information and preferences</p>
      </div>

      <div className="stat-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Company Information</h2>
          <button
            onClick={() => setEditMode(!editMode)}
            className="rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]"
          >
            {editMode ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editMode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
              <input
                type="text"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                <input
                  type="text"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">NTN</label>
              <input
                type="text"
                value={companyInfo.ntn}
                onChange={(e) => setCompanyInfo({ ...companyInfo, ntn: e.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button className="w-full rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752]">
              Save Changes
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
              <span className="font-medium text-slate-700 dark:text-slate-300">Company Name:</span>
              <span className="text-slate-900 dark:text-white">{companyInfo.name}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
              <span className="font-medium text-slate-700 dark:text-slate-300">Address:</span>
              <span className="text-slate-900 dark:text-white">{companyInfo.address}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
              <span className="font-medium text-slate-700 dark:text-slate-300">Phone:</span>
              <span className="text-slate-900 dark:text-white">{companyInfo.phone}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
              <span className="font-medium text-slate-700 dark:text-slate-300">Email:</span>
              <span className="text-slate-900 dark:text-white">{companyInfo.email}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
              <span className="font-medium text-slate-700 dark:text-slate-300">NTN:</span>
              <span className="text-slate-900 dark:text-white">{companyInfo.ntn}</span>
            </div>
          </div>
        )}
      </div>

      <div className="stat-card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Dark Mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Toggle between light and dark themes</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              isDark ? 'bg-navy' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="stat-card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Account Settings</h2>

        <div className="space-y-3">
          {!showChangePassword ? (
            <>
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                Change Password
              </button>
              <button
                onClick={() => navigate('/users')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                Manage Users
              </button>
              <button
                onClick={handleLogout}
                className="w-full rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Sign Out
              </button>
            </>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                if (newPassword !== confirmPassword) {
                  showToast('New password and confirmation do not match', 'error');
                  return;
                }

                try {
                  setChangingPassword(true);


                  await api.post('/users/change-password', {
                    currentPassword,
                    newPassword
                  });

                  showToast('Password updated successfully', 'success');
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                } catch (err: any) {
                  showToast(err?.response?.data?.message || 'Failed to update password', 'error');
                } finally {
                  setChangingPassword(false);
                }
              }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Change Password</h3>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full rounded-2xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163752] disabled:opacity-60"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}