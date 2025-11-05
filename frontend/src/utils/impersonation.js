/**
 * Utility functions for handling super admin impersonation
 */

export const getImpersonationState = () => {
  const impersonationData = localStorage.getItem('impersonation');
  if (!impersonationData) return null;
  
  try {
    return JSON.parse(impersonationData);
  } catch {
    return null;
  }
};

export const setImpersonationState = (companyName, companyId, canEdit) => {
  const impersonationData = {
    companyName,
    companyId,
    canEdit,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem('impersonation', JSON.stringify(impersonationData));
};

export const clearImpersonationState = () => {
  localStorage.removeItem('impersonation');
};

export const isImpersonating = () => {
  return getImpersonationState() !== null;
};

export const canEditInImpersonation = () => {
  const state = getImpersonationState();
  return state ? state.canEdit : false;
};
