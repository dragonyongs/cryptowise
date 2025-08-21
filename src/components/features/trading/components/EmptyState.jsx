// src/components/features/testing/components/EmptyState.jsx
import React from "react";

const EmptyState = ({ title, subtitle, icon: Icon }) => {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="w-12 h-12 mx-auto mb-4 text-gray-300" />}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {subtitle && <p className="text-gray-500">{subtitle}</p>}
    </div>
  );
};

export default React.memo(EmptyState);
