export const AUTO_VALUE_PLACEHOLDER = "—";

export const titleCaseFromSnake = (value: string): string =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return AUTO_VALUE_PLACEHOLDER;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return String(value);
    }
    if (Math.abs(value) >= 100) {
      return value.toFixed(0);
    }
    if (Math.abs(value) >= 1) {
      return value.toFixed(2);
    }
    return value.toPrecision(2);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return value.trim() === "" ? AUTO_VALUE_PLACEHOLDER : value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const formatTimestamp = (value?: string | null): string => {
  if (!value) {
    return AUTO_VALUE_PLACEHOLDER;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};
