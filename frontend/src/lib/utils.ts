import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy");
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy, HH:mm");
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "HH:mm");
}

export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatHours(value?: number | null): string {
  if (value === undefined || value === null) return "—";
  return `${value.toFixed(2)}h`;
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

export function csvDownload(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}