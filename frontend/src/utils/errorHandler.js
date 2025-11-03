/**
 * Utility function to format API error messages from FastAPI/Pydantic validation errors
 * @param {Error} error - Axios error object
 * @param {string} fallbackMessage - Default message if error parsing fails
 * @returns {string} - Formatted error message
 */
export const formatErrorMessage = (error, fallbackMessage = 'Operation failed') => {
  if (!error.response?.data) return fallbackMessage;
  
  const data = error.response.data;
  
  // Handle FastAPI validation errors (array of error objects)
  if (Array.isArray(data.detail)) {
    return data.detail
      .map(err => {
        // Extract the field name from location array if available
        const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : '';
        const message = err.msg || JSON.stringify(err);
        return field ? `${field}: ${message}` : message;
      })
      .join('; ');
  }
  
  // Handle simple string detail
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  
  // Handle single object error with msg property
  if (typeof data.detail === 'object' && data.detail !== null) {
    if (data.detail.msg) return data.detail.msg;
    if (data.detail.message) return data.detail.message;
  }
  
  // Handle other error formats
  if (data.message) return data.message;
  if (data.error) return data.error;
  
  return fallbackMessage;
};
