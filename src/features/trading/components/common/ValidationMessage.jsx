// src/features/trading/components/common/ValidationMessage.jsx
import React from "react";
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "lucide-react";

const ValidationMessage = React.memo(
  ({
    type = "error", // 'error' | 'warning' | 'success' | 'info'
    message,
    className = "",
  }) => {
    if (!message) return null;

    const icons = {
      error: AlertTriangleIcon,
      warning: AlertTriangleIcon,
      success: CheckCircleIcon,
      info: InfoIcon,
    };

    const styles = {
      error:
        "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
      warning:
        "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
      success:
        "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
      info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200",
    };

    const iconStyles = {
      error: "text-red-600 dark:text-red-400",
      warning: "text-yellow-600 dark:text-yellow-400",
      success: "text-green-600 dark:text-green-400",
      info: "text-blue-600 dark:text-blue-400",
    };

    const Icon = icons[type];

    return (
      <div
        className={`flex items-start p-4 border rounded-md ${styles[type]} ${className}`}
        role="alert"
      >
        <Icon
          size={16}
          className={`flex-shrink-0 mt-0.5 mr-3 ${iconStyles[type]}`}
        />
        <span className="text-sm font-medium">{message}</span>
      </div>
    );
  }
);

ValidationMessage.displayName = "ValidationMessage";

export default ValidationMessage;
