import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';

import AuthPage from './pages/AuthPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SectorDashboard from './pages/SectorDashboard';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import ServicesPage from './pages/ServicesPage';
import AppointmentsPage from './pages/AppointmentsPage';
import RepairsPage from './pages/RepairsPage';
import TablesPage from './pages/TablesPage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import ClinicPage from './pages/ClinicPage';
import { Toaster } from './components/ui/sonner';
import { isSectorAllowed } from './config/sectorModules';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Protected route wrapper
const SectorRoute = ({ user, element, module }) => {
  const businessType = user?.business_type;
  
  if (!businessType) return element;
  
  const isAllowed = isSectorAllowed(businessType, module);
  
  if (!isAllowed) {
    return <Navigate to={`/${businessType}`} replace />;
  }
  
  return element;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={
            !user ? <AuthPage onLogin={handleLogin} /> : <Navigate to="/" />
          } />
          
          {user ? (
            <>
              <Route path="/" element={
                user.role === 'super_admin' ? 
                  <SuperAdminDashboard user={user} onLogout={handleLogout} /> :
                  <TenantDashboard user={user} onLogout={handleLogout} />
              } />
              <Route path="/pos" element={<POSPage user={user} onLogout={handleLogout} />} />
              <Route path="/products" element={<ProductsPage user={user} onLogout={handleLogout} />} />
              <Route path="/services" element={<ServicesPage user={user} onLogout={handleLogout} />} />
              <Route path="/appointments" element={<AppointmentsPage user={user} onLogout={handleLogout} />} />
              <Route path="/repairs" element={<RepairsPage user={user} onLogout={handleLogout} />} />
              <Route path="/tables" element={<TablesPage user={user} onLogout={handleLogout} />} />
              <Route path="/customers" element={<CustomersPage user={user} onLogout={handleLogout} />} />
              <Route path="/expenses" element={<ExpensesPage user={user} onLogout={handleLogout} />} />
              <Route path="/clinic" element={<ClinicPage user={user} onLogout={handleLogout} />} />
              <Route path="/sales" element={<SalesPage user={user} onLogout={handleLogout} />} />
              <Route path="/reports" element={<ReportsPage user={user} onLogout={handleLogout} />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/auth" />} />
          )}
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default App;