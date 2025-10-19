// Sector-specific module configurations

export const SECTOR_MODULES = {
  pharmacy: {
    name: 'Pharmacy',
    icon: '💊',
    color: 'blue',
    modules: ['dashboard', 'products', 'pos', 'sales', 'customers', 'suppliers', 'expenses', 'reports']
  },
  salon: {
    name: 'Salon & Spa',
    icon: '✂️',
    color: 'pink',
    modules: ['dashboard', 'services', 'appointments', 'customers', 'expenses', 'reports']
  },
  restaurant: {
    name: 'Restaurant',
    icon: '🍽️',
    color: 'orange',
    modules: ['dashboard', 'tables', 'products', 'pos', 'sales', 'customers', 'reports']
  },
  mobile_shop: {
    name: 'Mobile Shop',
    icon: '📱',
    color: 'purple',
    modules: ['dashboard', 'products', 'repairs', 'pos', 'sales', 'customers', 'reports']
  },
  grocery: {
    name: 'Grocery',
    icon: '🛒',
    color: 'green',
    modules: ['dashboard', 'products', 'offers', 'pos', 'sales', 'suppliers', 'customers', 'expenses', 'reports']
  },
  clinic: {
    name: 'Clinic',
    icon: '🏥',
    color: 'red',
    modules: ['dashboard', 'doctors', 'patients', 'appointments', 'services', 'expenses', 'reports']
  },
  electronics: {
    name: 'Electronics',
    icon: '💻',
    color: 'indigo',
    modules: ['dashboard', 'products', 'repairs', 'pos', 'sales', 'customers', 'suppliers', 'reports']
  },
  fashion: {
    name: 'Fashion',
    icon: '👗',
    color: 'pink',
    modules: ['dashboard', 'products', 'variants', 'offers', 'pos', 'sales', 'customers', 'reports']
  },
  stationery: {
    name: 'Stationery',
    icon: '📚',
    color: 'yellow',
    modules: ['dashboard', 'products', 'pos', 'sales', 'customers', 'suppliers', 'reports']
  },
  hardware: {
    name: 'Hardware',
    icon: '🔧',
    color: 'gray',
    modules: ['dashboard', 'products', 'pos', 'sales', 'suppliers', 'customers', 'expenses', 'reports']
  },
  furniture: {
    name: 'Furniture',
    icon: '🛋️',
    color: 'brown',
    modules: ['dashboard', 'products', 'pos', 'sales', 'customers', 'expenses', 'reports']
  },
  garage: {
    name: 'Garage',
    icon: '🚗',
    color: 'blue',
    modules: ['dashboard', 'vehicles', 'repairs', 'services', 'customers', 'expenses', 'reports']
  },
  wholesale: {
    name: 'Wholesale',
    icon: '📦',
    color: 'teal',
    modules: ['dashboard', 'products', 'offers', 'pos', 'sales', 'suppliers', 'customers', 'reports']
  },
  ecommerce: {
    name: 'E-commerce',
    icon: '🛍️',
    color: 'purple',
    modules: ['dashboard', 'products', 'sales', 'customers', 'reports']
  },
  real_estate: {
    name: 'Real Estate',
    icon: '🏘️',
    color: 'green',
    modules: ['dashboard', 'properties', 'customers', 'expenses', 'reports']
  }
};

// Module to route mapping
export const MODULE_ROUTES = {
  dashboard: { path: '', label: 'Dashboard' },
  products: { path: '/products', label: 'Products' },
  services: { path: '/services', label: 'Services' },
  appointments: { path: '/appointments', label: 'Appointments' },
  repairs: { path: '/repairs', label: 'Repairs' },
  tables: { path: '/tables', label: 'Tables' },
  pos: { path: '/pos', label: 'POS' },
  sales: { path: '/sales', label: 'Sales' },
  customers: { path: '/customers', label: 'Customers' },
  suppliers: { path: '/suppliers', label: 'Suppliers' },
  expenses: { path: '/expenses', label: 'Expenses' },
  reports: { path: '/reports', label: 'Reports' },
  doctors: { path: '/doctors', label: 'Doctors' },
  patients: { path: '/patients', label: 'Patients' },
  vehicles: { path: '/vehicles', label: 'Vehicles' },
  properties: { path: '/properties', label: 'Properties' },
  offers: { path: '/offers', label: 'Offers' },
  variants: { path: '/variants', label: 'Variants' }
};

export const getSectorModules = (businessType) => {
  return SECTOR_MODULES[businessType] || SECTOR_MODULES.pharmacy;
};

export const isSectorAllowed = (businessType, module) => {
  const sectorConfig = SECTOR_MODULES[businessType];
  if (!sectorConfig) return false;
  return sectorConfig.modules.includes(module);
};
