import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString)
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const ano = d.getFullYear()
  const hora = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dia}/${mes}/${ano} ${hora}:${min}`
}

export function formatDateShort(dateString: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(dateString))
}

export function hojeISO(): string {
  return new Date().toISOString().split("T")[0].replace(/-/g, "")
}

export function diasAtrasISO(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().split("T")[0].replace(/-/g, "")
}
