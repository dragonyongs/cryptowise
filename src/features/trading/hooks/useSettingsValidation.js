// src/features/trading/hooks/useSettingsValidation.js
import { useMemo } from "react";
import { validateAllSettings } from "../utils/settingsValidator";

export const useSettingsValidation = (settings) => {
  const validationResult = useMemo(() => {
    return validateAllSettings(settings);
  }, [settings]);

  const hasErrors = useMemo(() => {
    return !validationResult.isValid;
  }, [validationResult.isValid]);

  const getFieldError = (fieldPath) => {
    return validationResult.errors[fieldPath];
  };

  const getFieldStatus = (fieldPath) => {
    return validationResult.errors[fieldPath] ? "error" : "success";
  };

  return {
    validationResult,
    hasErrors,
    getFieldError,
    getFieldStatus,
    errors: validationResult.errors,
  };
};
