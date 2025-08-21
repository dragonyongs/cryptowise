// src/components/features/testing/components/EmptyState.jsx - 모던 디자인

import React from "react";

const EmptyState = ({
  title,
  subtitle,
  icon: Icon,
  action,
  actionText,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}

      <h3 className="text-lg font-medium text-slate-900 mb-2">
        {title}
      </h3>

      {subtitle && (
        <p className="text-slate-500 max-w-sm mb-4">
          {subtitle}
        </p>
      )}

      {action && actionText && (
        <button
          onClick={action}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
