export const ERROR_MESSAGES = {
  NOT_FOUND: (id?: string) => `Spreadsheet ${id ? `"${id}"` : ""} not found`,
  CONNECTION_FAILED: () => "Failed to connect to server. Please try again.",
  UNAUTHORIZED: () => "You don't have permission to access this spreadsheet",
  SERVER_ERROR: () => "Something went wrong. Please try again later.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export const getErrorMessage = (
  code: string | null,
  params?: Record<string, string>
): string => {
  if (!code || !(code in ERROR_MESSAGES)) return "";
  return ERROR_MESSAGES[code as ErrorCode](params?.id);
};
