import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Wallet from './pages/Wallet';
import Lobby from './pages/Lobby';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import CouponManager from './pages/admin/CouponManager';
import AdminLedger from './pages/admin/AdminLedger';
import RoomManager from './pages/admin/RoomManager';
import CashoutManager from './pages/admin/CashoutManager';
import UserManager from './pages/admin/UserManager';
import NoticeManager from './pages/admin/NoticeManager';
import NoticeModal from './components/NoticeModal';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
          <Navbar />
          <NoticeModal />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#111827',
                color: '#fff',
                border: '1px solid #374151',
                borderRadius: '0.75rem',
                fontSize: '0.875rem'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff'
                }
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff'
                }
              }
            }}
          />
          <main className="flex-1">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<PrivacyPolicy />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Lobby />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lobby"
                element={
                  <ProtectedRoute>
                    <Lobby />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute>
                    <Wallet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UserManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/coupons"
                element={
                  <ProtectedRoute requireAdmin>
                    <CouponManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ledger"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLedger />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rooms"
                element={
                  <ProtectedRoute requireAdmin>
                    <RoomManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cashouts"
                element={
                  <ProtectedRoute requireAdmin>
                    <CashoutManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/notice"
                element={
                  <ProtectedRoute requireAdmin>
                    <NoticeManager />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
