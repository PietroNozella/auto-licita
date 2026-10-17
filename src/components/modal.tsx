"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"

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

  useEffect(() => {
    const gatilho = document.activeElement as HTMLElement | null
    const container = containerRef.current
    if (container) {
      container.querySelector<HTMLElement>(FOCAVEL)?.focus()
    }

    function noTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab" || !container) return
      const focaveis = Array.from(container.querySelectorAll<HTMLElement>(FOCAVEL))
      if (focaveis.length === 0) return
      const atual = document.activeElement
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && atual === primeiro) {
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
      gatilho?.focus()
    }
  }, [onClose])

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
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h3 id={tituloId} className="text-lg font-semibold text-zinc-800">
          {titulo}
        </h3>
        {children}
      </div>
    </div>
  )
}
