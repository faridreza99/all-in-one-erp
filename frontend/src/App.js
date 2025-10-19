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
            !user ? <AuthPage onLogin={handleLogin} /> : (
              user.role === 'super_admin' ? 
                <Navigate to="/" /> : 
                <Navigate to={`/${user.business_type}`} />
            )
          } />
          
          {user ? (
            <>
              {/* Super Admin Route */}
              {user.role === 'super_admin' && (
                <Route path="/" element={<SuperAdminDashboard user={user} onLogout={handleLogout} />} />
              )}
              
              {/* Sector-Specific Routes */}
              {user.business_type && (
                <>
                  {/* Dashboard */}
                  <Route 
                    path={`/${user.business_type}`} 
                    element={<SectorDashboard user={user} onLogout={handleLogout} />} 
                  />
                  
                  {/* Module Routes with access control */}
                  <Route 
                    path={`/${user.business_type}/products`} 
                    element={<SectorRoute user={user} module="products" element={<ProductsPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/pos`} 
                    element={<SectorRoute user={user} module="pos" element={<POSPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/services`} 
                    element={<SectorRoute user={user} module="services" element={<ServicesPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/appointments`} 
                    element={<SectorRoute user={user} module="appointments" element={<AppointmentsPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/repairs`} 
                    element={<SectorRoute user={user} module="repairs" element={<RepairsPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/tables`} 
                    element={<SectorRoute user={user} module="tables" element={<TablesPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/customers`} 
                    element={<SectorRoute user={user} module="customers" element={<CustomersPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/suppliers`} 
                    element={<SectorRoute user={user} module="suppliers" element={<CustomersPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/expenses`} 
                    element={<SectorRoute user={user} module="expenses" element={<ExpensesPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/doctors`} 
                    element={<SectorRoute user={user} module="doctors" element={<ClinicPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/patients`} 
                    element={<SectorRoute user={user} module="patients" element={<ClinicPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/sales`} 
                    element={<SectorRoute user={user} module="sales" element={<SalesPage user={user} onLogout={handleLogout} />} />}
                  />
                  <Route 
                    path={`/${user.business_type}/reports`} 
                    element={<SectorRoute user={user} module="reports" element={<ReportsPage user={user} onLogout={handleLogout} />} />}
                  />
                  
                  {/* Redirect root to sector dashboard */}
                  <Route path="/" element={<Navigate to={`/${user.business_type}`} />} />
                </>
              )}
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