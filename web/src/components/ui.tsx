import { useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Shared Tailwind building blocks so storefront pages match the Stitch homepage. */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Page({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return (
    <div className={cx('mx-auto px-margin md:px-margin-desktop py-space-xl space-y-space-lg', narrow ? 'max-w-3xl' : 'max-w-[1280px]', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  breadcrumb?: { label: string; to?: string }[]
}) {
  return (
    <div className="space-y-space-xs">
      {breadcrumb && (
        <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 font-label-md text-label-md text-on-surface-variant">
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span className="material-symbols-outlined text-sm">chevron_right</span>}
              {item.to ? <Link className="hover:text-primary" to={item.to}>{item.label}</Link> : <span className="text-on-surface">{item.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
          {subtitle && <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
      </div>
    </div>
  )
}

export function Card({ children, className, as: Tag = 'div', ...rest }: HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' | 'aside' | 'form' }) {
  return (
    <Tag className={cx('bg-surface-container-lowest rounded-xl shadow-sm p-space-lg', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function CardTitle({ children, icon, actions }: { children: ReactNode; icon?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-space-sm mb-space-md">
      <h2 className="flex items-center gap-space-xs font-headline-md text-headline-md text-on-surface">
        {icon && <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>}
        {children}
      </h2>
      {actions}
    </div>
  )
}

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container',
  secondary: 'bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim',
  outline: 'border border-line bg-surface-container-lowest text-on-surface hover:bg-surface-container',
  ghost: 'text-on-surface hover:bg-surface-container',
  danger: 'bg-error text-on-error hover:opacity-90',
}

const SIZES: Record<Size, string> = {
  sm: 'px-space-sm py-1 font-label-md text-label-md',
  md: 'px-space-md py-2 font-title-md text-title-md',
  lg: 'px-space-lg py-3 font-title-lg text-title-lg',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(
    'inline-flex items-center justify-center gap-space-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap',
    'disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    VARIANTS[variant], SIZES[size], className,
  )
}

export function Button({ variant, size, icon, className, children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: string
}) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ComponentProps<typeof Link> & {
  variant?: Variant
  size?: Size
  icon?: string
}) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
      {children}
    </Link>
  )
}

export const inputClass = cx(
  'w-full rounded-lg border border-line bg-surface-container-lowest px-space-md py-2',
  'font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant',
  'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60',
)

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1', className)}>
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      {children}
      {hint && <span className="font-label-sm text-label-sm text-on-surface-variant">{hint}</span>}
    </label>
  )
}

type Tone = 'neutral' | 'primary' | 'success' | 'info' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-container-high text-on-surface',
  primary: 'bg-primary-fixed text-on-primary-fixed',
  success: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-tertiary-fixed text-on-tertiary-fixed',
  danger: 'bg-error-container text-on-error-container',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-label-sm text-label-sm', TONES[tone], className)}>
      {children}
    </span>
  )
}

export function Alert({ tone = 'danger', children, className }: { tone?: Exclude<Tone, 'neutral' | 'primary'>; children: ReactNode; className?: string }) {
  const icon = tone === 'success' ? 'check_circle' : tone === 'info' ? 'info' : 'error'
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-space-sm rounded-lg px-space-md py-space-sm font-body-md text-body-md', TONES[tone], className)}>
      <span className="material-symbols-outlined text-lg">{icon}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function EmptyState({ icon = 'inventory_2', title, description, action }: { icon?: string; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-space-sm py-space-xl px-space-lg">
      <span className="material-symbols-outlined text-5xl text-outline">{icon}</span>
      <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
      {description && <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">{description}</p>}
      {action && <div className="mt-space-sm">{action}</div>}
    </div>
  )
}

export function Loading({ children = 'Đang tải…' }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-space-xs font-body-md text-body-md text-on-surface-variant py-space-lg">
      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
      {children}
    </p>
  )
}

export function Chip({ active, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        'px-space-md py-1.5 rounded-lg font-title-md text-title-md whitespace-nowrap transition-colors cursor-pointer shadow-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function formatPrice(amount: number | null | undefined) {
  return amount == null ? 'Chưa có giá' : `₫${amount.toLocaleString('vi-VN')}`
}

/** Selectable card wrapping a native radio (keyboard + screen-reader behaviour stays native). */
export function RadioCard({ name, checked, onChange, children, className, aside }: {
  name: string
  checked: boolean
  onChange: () => void
  children: ReactNode
  className?: string
  aside?: ReactNode
}) {
  return (
    <label className={cx(
      'flex items-start gap-space-sm rounded-lg border p-space-md cursor-pointer transition-colors',
      checked ? 'border-primary bg-primary-fixed/40' : 'border-line hover:border-primary/60',
      className,
    )}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 accent-primary w-4 h-4" />
      <span className="flex-1 min-w-0">{children}</span>
      {aside}
    </label>
  )
}

export function SummaryRow({ label, value, strong, className }: { label: ReactNode; value: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cx('flex items-baseline justify-between gap-space-md', strong ? 'pt-space-sm border-t border-line' : '', className)}>
      <span className={strong ? 'font-title-lg text-title-lg text-on-surface' : 'font-body-md text-body-md text-on-surface-variant'}>{label}</span>
      <span className={strong ? 'font-price-lg text-price-lg text-primary' : 'font-title-md text-title-md text-on-surface'}>{value}</span>
    </div>
  )
}

export function Modal({ title, eyebrow, onClose, children, footer }: {
  title: ReactNode
  eyebrow?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-space-lg"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
      onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}
    >
      <section className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-t-xl sm:rounded-xl shadow-lg" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="flex items-start justify-between gap-space-md px-space-lg pt-space-lg pb-space-sm border-b border-line">
          <div>
            {eyebrow && <p className="font-label-md text-label-md text-primary uppercase">{eyebrow}</p>}
            <h2 id="modal-title" className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          </div>
          <button type="button" className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer" aria-label="Đóng" onClick={onClose} autoFocus>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-space-lg py-space-md space-y-space-sm">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-between gap-space-sm px-space-lg py-space-md border-t border-line">{footer}</footer>}
      </section>
    </div>
  )
}

/**
 * −/+ stepper with a typeable number in the middle. Typing is kept as a draft
 * and committed on blur/Enter (Esc reverts), clamped to [min, max].
 */
export function QtyStepper({ value, onChange, min = 1, max, disabled, label = 'số lượng' }: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number | null
  disabled?: boolean
  label?: string
}) {
  const [draft, setDraft] = useState(String(value))
  const [syncedValue, setSyncedValue] = useState(value)
  // Esc blurs the input; the blur must not commit the draft it just discarded.
  const skipNextCommit = useRef(false)
  if (value !== syncedValue) {
    // Parent changed the value (stepper click, variant switch, server update): show it.
    setSyncedValue(value)
    setDraft(String(value))
  }

  const clamp = (n: number) => Math.max(min, max == null ? n : Math.min(n, max))

  const commit = () => {
    if (skipNextCommit.current) {
      skipNextCommit.current = false
      setDraft(String(value))
      return
    }
    const parsed = Number(draft)
    if (draft === '' || !Number.isSafeInteger(parsed)) {
      setDraft(String(value))
      return
    }
    const next = clamp(parsed)
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  const step = (delta: number) => {
    const next = clamp(value + delta)
    if (next !== value) onChange(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      skipNextCommit.current = true
      setDraft(String(value))
      event.currentTarget.blur()
    }
  }

  const stepClass = 'w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div className={cx('inline-flex items-center rounded-lg border border-line bg-surface-container-lowest overflow-hidden', disabled && 'opacity-60')}>
      <button type="button" className={stepClass} disabled={disabled || value <= min} onClick={() => step(-1)} aria-label={`Giảm ${label}`}>
        <span className="material-symbols-outlined text-base">remove</span>
      </button>
      <input
        className="w-12 h-8 text-center font-title-md text-title-md text-on-surface bg-transparent border-x border-line focus:outline-none focus:bg-surface-container-low disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        type="number"
        inputMode="numeric"
        min={min}
        max={max ?? undefined}
        step={1}
        value={draft}
        disabled={disabled}
        aria-label={label.charAt(0).toUpperCase() + label.slice(1)}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const next = event.currentTarget.value
          if (next === '' || /^\d+$/.test(next)) setDraft(next)
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <button type="button" className={stepClass} disabled={disabled || (max != null && value >= max)} onClick={() => step(1)} aria-label={`Tăng ${label}`}>
        <span className="material-symbols-outlined text-base">add</span>
      </button>
    </div>
  )
}
