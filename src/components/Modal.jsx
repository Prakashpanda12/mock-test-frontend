import React from 'react';

export const Modal = ({ isOpen, title, message, type = 'confirm', onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`px-6 py-4 border-b ${type === 'danger' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${type === 'danger' ? 'text-red-700' : 'text-gray-900'}`}>
            {title}
          </h3>
        </div>
        
        <div className="px-6 py-6 text-gray-700 whitespace-pre-wrap">
          {message}
          {children && <div className="mt-4">{children}</div>}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          {type !== 'alert' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-testyari-blue transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-testyari-blue hover:bg-blue-700 focus:ring-testyari-blue'
            }`}
          >
            {type === 'alert' ? 'OK' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
