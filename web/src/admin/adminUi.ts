import { cx, inputClass } from '../components/ui'

/**
 * Tailwind class sets for the admin area. Tables and forms style their
 * children through descendant variants ([&_th]:…) so page markup stays plain
 * <table>/<label>/<input> without repeating classes on every cell.
 */

const controls = cx(
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:w-full',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:min-w-0',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:rounded-lg',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:border',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:border-line',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:bg-surface-container-lowest',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:px-space-sm',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:py-2',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:font-body-lg',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:text-body-lg',
  '[&_:is(input:not([type=checkbox]):not([type=radio]),select,textarea)]:text-on-surface',
  '[&_:is(input,select,textarea):focus]:outline-none',
  '[&_:is(input,select,textarea):focus]:border-primary',
  '[&_:is(input,select,textarea):focus]:ring-2',
  '[&_:is(input,select,textarea):focus]:ring-primary/20',
  '[&_:is(input,select,textarea):disabled]:opacity-60',
  '[&_input[type=checkbox]]:w-4 [&_input[type=checkbox]]:h-4 [&_input[type=checkbox]]:accent-primary',
  '[&_small]:font-label-sm [&_small]:text-label-sm [&_small]:text-on-surface-variant [&_small]:font-normal',
)

const labels = '[&_label]:flex [&_label]:flex-col [&_label]:gap-1 [&_label]:font-label-md [&_label]:text-label-md [&_label]:text-on-surface-variant'

export const a = {
  input: inputClass,
  pageTitle: 'font-headline-lg text-headline-lg text-on-surface mb-space-lg',
  toolbar: 'flex flex-wrap items-center justify-between gap-space-md mb-space-md',
  card: 'bg-surface-container-lowest rounded-xl shadow-sm p-space-lg',
  statRow: 'grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-space-md mb-space-lg',
  statLabel: 'font-label-md text-label-md text-on-surface-variant mb-1.5',
  statValue: 'font-headline-lg text-headline-lg text-on-surface',
  tableWrap: 'bg-surface-container-lowest rounded-xl shadow-sm overflow-x-auto',
  table: cx(
    'w-full min-w-[720px] border-collapse font-body-md text-body-md text-on-surface',
    '[&_th]:text-left [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:border-b [&_th]:border-line [&_th]:bg-surface-container-low',
    '[&_th]:font-label-md [&_th]:text-label-md [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-on-surface-variant [&_th]:whitespace-nowrap',
    '[&_td]:px-3.5 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-line [&_td]:align-middle',
    '[&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover_td]:bg-surface-container-low [&_tr.is-selected_td]:bg-primary-fixed/50',
    controls,
  ),
  tableCompact: cx(
    'w-full border-collapse font-body-md text-body-md text-on-surface',
    '[&_td]:py-1.5 [&_td]:px-1 [&_td]:border-b [&_td]:border-line [&_tr:last-child_td]:border-b-0',
  ),
  sortable: 'cursor-pointer select-none hover:!text-on-surface',
  formGrid: cx('grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-space-md mb-space-lg', labels, controls),
  catalogForm: cx('grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg mb-space-lg', labels, controls),
  formHeading: 'col-span-full flex items-center justify-between [&_h2]:font-headline-md [&_h2]:text-headline-md [&_h2]:text-on-surface',
  formWide: 'md:col-span-2',
  formActions: 'col-span-full flex flex-wrap justify-end gap-space-sm',
  formMessage: 'col-span-full font-body-md text-body-md text-error',
  rowActions: 'flex flex-wrap gap-1.5',
  filterBar: 'flex flex-wrap items-center gap-space-xs',
  empty: 'flex flex-col items-center gap-space-sm py-space-xl text-center font-body-md text-body-md text-on-surface-variant',
  bulkBar: 'flex flex-wrap items-center gap-space-sm rounded-lg border border-primary bg-primary-fixed/50 px-space-md py-2 mb-space-md font-title-md text-title-md text-on-primary-fixed',
  toast: 'fixed bottom-6 right-6 z-50 rounded-lg bg-inverse-surface text-inverse-on-surface px-space-lg py-2.5 font-title-md text-title-md shadow-lg',
  linkButton: 'p-0 bg-transparent border-0 font-bold text-primary underline cursor-pointer',
  quickLink: 'block bg-surface-container-lowest rounded-xl shadow-sm border border-transparent hover:border-primary p-space-md transition-colors [&_strong]:block [&_strong]:font-title-md [&_strong]:text-title-md [&_strong]:text-on-surface [&_strong]:mb-0.5 [&_span]:font-body-md [&_span]:text-body-md [&_span]:text-on-surface-variant',
  receiptLine: cx('grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] items-end gap-2.5 py-2.5 border-b border-line', labels, controls),
}

export function chipClass(active: boolean) {
  return cx(
    'px-space-md py-1.5 rounded-lg font-title-md text-title-md whitespace-nowrap transition-colors cursor-pointer shadow-sm',
    active ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container',
  )
}

export function pageButtonClass(active: boolean) {
  return cx(
    'min-w-9 h-9 px-2 rounded-lg font-title-md text-title-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    active ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container',
  )
}

/** status-pill replacement: account / publish / receipt states. */
export function statusPillClass(tone: 'active' | 'locked' | 'deleted' | 'info') {
  const tones = {
    active: 'bg-secondary-container text-on-secondary-container',
    locked: 'bg-primary-fixed text-on-primary-fixed',
    deleted: 'bg-error-container text-on-error-container',
    info: 'bg-tertiary-fixed text-on-tertiary-fixed',
  }
  return cx('inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm whitespace-nowrap', tones[tone])
}
