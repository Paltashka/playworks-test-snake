export const APP_ENV = import.meta?.env?.MODE ?? "development";
export const IS_DEV = APP_ENV !== "production";

export const FEATURE_FLAGS = Object.freeze({
  enableDebugLogs: IS_DEV,
  enableTelemetry: IS_DEV,
});
