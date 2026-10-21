import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value)
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return "Data não informada"
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short"
  })
    .format(d)
    .replace(",", "")
}

export function formatDateShort(dateString: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString.split("-").reverse().join("/")
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return "Data não informada"
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(d)
}

// Data corrente no fuso de São Paulo, em "yyyy-mm-dd".
// (toISOString usa UTC e vira o dia às 21h de Brasília.)
export function dataSp(diasAtras = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d)
}

// "20261015" vira "2026-10-15"; entradas fora do formato ficam como estão.
export function paraDataIso(yyyymmdd: string): string {
  if (/^\d{8}$/.test(yyyymmdd)) {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
  }
  return yyyymmdd
}
