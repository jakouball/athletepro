'use client'

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Smazat',
  cancelLabel = 'Zrušit',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-sm text-ink hover:bg-surface-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
