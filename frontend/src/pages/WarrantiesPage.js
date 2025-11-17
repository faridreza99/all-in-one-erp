import React from 'react';
import WarrantyDashboard from './WarrantyDashboard';

// Wrapper component for backward compatibility
const WarrantiesPage = ({ user, onLogout }) => {
  return <WarrantyDashboard />;
};

export default WarrantiesPage;
