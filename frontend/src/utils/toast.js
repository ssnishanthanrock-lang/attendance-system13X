import { toast as sonnerToast } from 'sonner';

// Custom toast helpers with consistent styling
export const toast = {
  success: (message, options = {}) => {
    return sonnerToast.success(message, {
      ...options,
      style: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        borderLeft: '4px solid #047857',
        padding: '16px',
        borderRadius: '8px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        ...options.style
      }
    });
  },

  error: (message, options = {}) => {
    return sonnerToast.error(message, {
      ...options,
      style: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        border: 'none',
        borderLeft: '4px solid #b91c1c',
        padding: '16px',
        borderRadius: '8px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        ...options.style
      }
    });
  },

  warning: (message, options = {}) => {
    return sonnerToast.warning(message, {
      ...options,
      style: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        border: 'none',
        borderLeft: '4px solid #b45309',
        padding: '16px',
        borderRadius: '8px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        ...options.style
      }
    });
  },

  info: (message, options = {}) => {
    return sonnerToast.info(message, {
      ...options,
      style: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        border: 'none',
        borderLeft: '4px solid #1d4ed8',
        padding: '16px',
        borderRadius: '8px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        ...options.style
      }
    });
  },

  // Special toast for delete actions
  delete: (message, options = {}) => {
    return sonnerToast.error(message, {
      ...options,
      icon: '🗑️',
      style: {
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        color: 'white',
        border: 'none',
        borderLeft: '4px solid #991b1b',
        padding: '16px',
        borderRadius: '8px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        ...options.style
      }
    });
  },

  // Special toast for update actions
  update: (message, options = {}) => {
    return sonnerToast.success(message, {
      ...options,
      icon: '✓',
      style: {
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: 'white',
        border: 'none',
        borderLeft: '4px solid #6d28d9',
        padding: '16px',
        borderRadius: '8px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        ...options.style
      }
    });
  }
};
