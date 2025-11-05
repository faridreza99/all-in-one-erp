// Utility functions for formatting currency and dates for Bangladesh market

/**
 * Format number as Bangladeshi Taka (৳)
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '৳0.00';
  }
  return `৳${Number(amount).toFixed(decimals)}`;
};

/**
 * Format date in DD-MM-YYYY format (Bangladesh standard)
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Format date with time in DD-MM-YYYY HH:MM format
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date-time string
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/**
 * Format date for display with full month name (e.g., 01 January 2025)
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateLong = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const year = dateObj.getFullYear();
  
  return `${day} ${month} ${year}`;
};
