import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

/**
 * App-wide toast/popup provider.
 *
 * `showToast(message)` for a success confirmation, `showError(message)` for a
 * failure. Optionally pass an `onDone` callback to run once the toast has
 * finished animating out -- Login and Signup use it to delay navigation until
 * the popup has been seen.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const dismiss = useCallback(() => {
    setToast((current) => {
      if (current?.onDone) current.onDone();
      return null;
    });
  }, []);

  const showToast = useCallback((message, options = {}) => {
    setToast({ message, variant: 'success', ...options });
  }, []);

  const showError = useCallback((message, options = {}) => {
    setToast({ message, variant: 'error', duration: 3600, ...options });
  }, []);

  const value = useMemo(() => ({ showToast, showError, dismiss }), [showToast, showError, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        show={!!toast}
        message={toast?.message}
        variant={toast?.variant}
        duration={toast?.duration}
        onDone={dismiss}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
