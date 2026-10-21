"use client"

import { useEffect, useState } from "react"
import { instantePrazo, resumoPrazo } from "@/lib/prazo"

export function Deadline({ value }: { value?: string | null }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()))
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const timestamp = instantePrazo(value)
  const { label, tone } =
    now === null
      ? { label: timestamp === null ? "Prazo não informado" : "Encerramento", tone: "neutral" }
      : resumoPrazo(value, now)
  const color =
    tone === "urgent"
      ? "bg-red-50 text-red-800"
      : tone === "soon"
        ? "bg-amber-50 text-amber-900"
        : "bg-zinc-100 text-zinc-700"
  const date =
    timestamp === null
      ? null
      : new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          dateStyle: "short",
          ...(/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? {} : { timeStyle: "short" as const })
        }).format(timestamp)
  return (
    <div className="space-y-1">
      <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>
      {date && (
        <p className="text-sm tabular-nums text-zinc-700">
          <time dateTime={new Date(timestamp!).toISOString()}>{date}</time>
          <span className="block text-xs text-zinc-500">Horário de Brasília</span>
        </p>
      )}
    </div>
  )
}
