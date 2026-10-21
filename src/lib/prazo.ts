// Datas sem offset no PNCP são tratadas no fuso de Brasília.
export function instantePrazo(value?: string | null): number | null {
  if (!value) return null
  let normalized = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) normalized += "T23:59:59-03:00"
  else if (/T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(normalized)) normalized += "-03:00"
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function resumoPrazo(value: string | null | undefined, now: number) {
  const timestamp = instantePrazo(value)
  if (timestamp === null) return { label: "Prazo não informado", tone: "neutral" as const }
  const remaining = timestamp - now
  if (remaining <= 0) return { label: "Prazo encerrado", tone: "neutral" as const }
  const hours = Math.ceil(remaining / 3_600_000)
  if (hours <= 24) return { label: `Encerra em ${hours} h`, tone: "urgent" as const }
  const days = Math.ceil(remaining / 86_400_000)
  return { label: `Encerra em ${days} dias`, tone: days <= 3 ? ("soon" as const) : ("normal" as const) }
}
