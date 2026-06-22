/**
 * useToast — lightweight imperative toast hook.
 * Usage:  const { toast } = useToast();
 *         toast.success('Patient added!');
 *         toast.error('Something went wrong.');
 */
import { useContext } from 'react';
import { ToastContext } from '../components/Toast';

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};
