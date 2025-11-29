import i18n from "../i18n";

export const ERROR_CODES = [
  "NOT_FOUND",
  "CONNECTION_FAILED",
  "UNAUTHORIZED",
  "SERVER_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_KEYS: Record<ErrorCode, string> = {
  NOT_FOUND: "errors.notFound",
  CONNECTION_FAILED: "errors.connectionFailed",
  UNAUTHORIZED: "errors.unauthorized",
  SERVER_ERROR: "errors.serverError",
};

export const getErrorMessage = (
  code: string | null,
  params?: Record<string, string>
): string => {
  if (!code || !ERROR_CODES.includes(code as ErrorCode)) return "";
  return i18n.t(ERROR_KEYS[code as ErrorCode], { id: params?.id });
};
