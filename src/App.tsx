import { Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Layout from './components/Layout';
import Accounts from './pages/Accounts';
import Parties from './pages/Parties';
import Purchases from './pages/Purchases';
import PurchaseReturns from './pages/PurchaseReturns';
import Sales from './pages/Sales';
import SaleReturns from './pages/SaleReturns';
import Vouchers from './pages/Vouchers';
import Ledger from './pages/Ledger';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import { useAuth } from './components/AuthContext';
import RoleGuard from './components/RoleGuard';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {!isAuthenticated && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-navy to-slate-700 px-4 py-4 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20 text-gold">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Supreme Cotton</h1>
                <p className="text-xs text-slate-300">Ledger & Accounting System</p>
              </div>
            </div>
          </div>
        </header>
      )}
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/*"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="parties" element={<Parties />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="purchase-returns" element={<PurchaseReturns />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sale-returns" element={<SaleReturns />} />
          <Route path="vouchers" element={<Vouchers />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route
            path="users"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <Users />
              </RoleGuard>
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
