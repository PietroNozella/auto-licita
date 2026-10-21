import { FileSearch } from "lucide-react"

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-bold">
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-ink text-white ${large ? "h-12 w-12" : "h-9 w-9"}`}
      >
        <FileSearch className={large ? "h-7 w-7" : "h-5 w-5"} aria-hidden="true" />
      </span>
      <span className={large ? "text-2xl" : "text-xl"}>Afero</span>
    </span>
  )
}
