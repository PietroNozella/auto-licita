"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

const FOCAVEL =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"

interface ModalProps {
  titulo: string
  onClose: () => void
  children: ReactNode
}

// Diálogo modal (padrão APG): abre com foco no primeiro controle, prende o Tab
// dentro, fecha com Escape ou clique no fundo e devolve o foco ao gatilho.
export function Modal({ titulo, onClose, children }: ModalProps) {
  const tituloId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const gatilho = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const container = containerRef.current
    if (container) {
      const initial =
        container.querySelector<HTMLElement>("input, select, textarea") ??
        container.querySelector<HTMLElement>("button")
      if (initial) initial.focus()
      else container.focus()
    }

    function noTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeRef.current()
        return
      }
      if (e.key !== "Tab" || !container) return
      const focaveis = Array.from(container.querySelectorAll<HTMLElement>(FOCAVEL))
      if (focaveis.length === 0) return
      const atual = document.activeElement
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && (atual === primeiro || atual === container || !container.contains(atual))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (atual === ultimo || !container.contains(atual))) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    window.addEventListener("keydown", noTeclado)
    return () => {
      window.removeEventListener("keydown", noTeclado)
      document.body.style.overflow = previousOverflow
      gatilho?.focus()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id={tituloId} className="pt-2 text-lg font-semibold text-zinc-800">
            {titulo}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar diálogo"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
