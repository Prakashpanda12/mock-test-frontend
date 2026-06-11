import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '420px' }}>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ toast, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const icons = {
    success: (
      <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  const bgColors = {
    success: 'bg-gray-900 border-green-500/30',
    error: 'bg-gray-900 border-red-500/30',
    info: 'bg-gray-900 border-blue-500/30'
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-xl border text-white text-sm transition-all duration-300 ${bgColors[toast.type] || bgColors.success} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      {icons[toast.type] || icons.success}
      <p className="flex-1 whitespace-pre-line leading-relaxed">{toast.message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-white shrink-0 ml-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
