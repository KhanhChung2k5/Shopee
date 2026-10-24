import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Modal, buttonClass, inputClass } from '../components/ui'

/**
 * App-wide confirm / prompt dialogs in the shop's own style, replacing window.confirm / window.prompt.
 * Both return a promise, so call sites stay one line:  `if (!(await confirm({...}))) return`.
 */
interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' for destructive actions (red button + warning icon). */
  tone?: 'primary' | 'danger'
}

interface PromptOptions extends ConfirmOptions {
  label: string
  defaultValue?: string
  placeholder?: string
  hint?: ReactNode
  /** number: integer input with min/max; textarea: multi-line reason. */
  type?: 'text' | 'number' | 'textarea'
  min?: number
  max?: number
  required?: boolean
}

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void }

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setPending({ kind: 'confirm', options, resolve })
  }), [])

  const prompt = useCallback((options: PromptOptions) => new Promise<string | null>((resolve) => {
    setValue(options.defaultValue ?? '')
    setError('')
    setPending({ kind: 'prompt', options, resolve })
  }), [])

  useEffect(() => {
    if (pending?.kind === 'prompt') {
      const id = window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select?.() }, 0)
      return () => window.clearTimeout(id)
    }
  }, [pending])

  const close = (result: boolean | string | null) => {
    if (!pending) return
    if (pending.kind === 'confirm') pending.resolve(result === true)
    else pending.resolve(typeof result === 'string' ? result : null)
    setPending(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!pending) return
    if (pending.kind === 'confirm') return close(true)
    const { options } = pending
    const trimmed = value.trim()
    if ((options.required ?? true) && !trimmed) return setError('Vui lòng nhập thông tin.')
    if (options.type === 'number') {
      const n = Number(trimmed)
      if (!Number.isInteger(n)) return setError('Vui lòng nhập số nguyên.')
      if (options.min != null && n < options.min) return setError(`Giá trị tối thiểu là ${options.min}.`)
      if (options.max != null && n > options.max) return setError(`Giá trị tối đa là ${options.max}.`)
    }
    close(trimmed)
  }

  const options = pending?.options
  const danger = options?.tone === 'danger'

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {pending && options && (
        <Modal
          title={options.title}
          onClose={() => close(pending.kind === 'confirm' ? false : null)}
          footer={
            <div className="flex w-full justify-end gap-space-sm">
              <button type="button" className={buttonClass('outline')} onClick={() => close(pending.kind === 'confirm' ? false : null)}>
                {options.cancelLabel ?? 'Huỷ'}
              </button>
              <button type="submit" form="app-dialog-form" className={buttonClass(danger ? 'danger' : 'primary')}>
                {options.confirmLabel ?? (pending.kind === 'confirm' ? 'Đồng ý' : 'Xác nhận')}
              </button>
            </div>
          }
        >
          <form id="app-dialog-form" onSubmit={submit} noValidate className="space-y-space-sm">
            {options.message && (
              <div className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant">
                {danger && <span className="material-symbols-outlined text-error">warning</span>}
                <div>{options.message}</div>
              </div>
            )}
            {pending.kind === 'prompt' && (
              <label className="block space-y-1">
                <span className="font-label-md text-label-md text-on-surface">{pending.options.label}</span>
                {pending.options.type === 'textarea' ? (
                  <textarea ref={inputRef} rows={3} className={inputClass} value={value} placeholder={pending.options.placeholder}
                    onChange={(e) => { setValue(e.target.value); setError('') }} />
                ) : (
                  <input ref={inputRef} className={inputClass} value={value} placeholder={pending.options.placeholder}
                    type={pending.options.type === 'number' ? 'number' : 'text'} inputMode={pending.options.type === 'number' ? 'numeric' : undefined}
                    min={pending.options.min} max={pending.options.max} step={pending.options.type === 'number' ? 1 : undefined}
                    onChange={(e) => { setValue(e.target.value); setError('') }} />
                )}
                {pending.options.hint && !error && <span className="block font-label-md text-label-md text-on-surface-variant">{pending.options.hint}</span>}
                {error && <span role="alert" className="block font-label-md text-label-md text-error">{error}</span>}
              </label>
            )}
          </form>
        </Modal>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext)
  if (!api) throw new Error('useDialog must be used inside <DialogProvider>')
  return api
}
