import type { ReactNode } from 'react'

type StepPanelCardProps = {
  children: ReactNode
  className?: string
}

export function StepPanelCard({ children, className }: StepPanelCardProps) {
  return (
    <div
      className={`rounded-[32px] border border-gray-100 bg-white/85 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.25)] overflow-visible ${
        className ?? ''
      }`}
    >
      {children}
    </div>
  )
}

type StepPanelHeaderProps = {
  stepBadge: string
  statusText?: string
  title?: string
  subtitle?: string
  meta?: ReactNode
  gradientClassName?: string
}

export function StepPanelHeader({
  stepBadge,
  statusText,
  title,
  subtitle,
  meta,
  gradientClassName,
}: StepPanelHeaderProps) {
  const gradient = gradientClassName ?? 'bg-gradient-to-r from-primary-light via-primary to-primary-dark'

  return (
    <div className={`${gradient} px-5 py-3 text-gray-900 rounded-t-[32px]`}>
      <div className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-wide md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/70 text-gray-900 shadow-sm">{stepBadge}</span>
          {statusText ? <span className="text-gray-900/70">{statusText}</span> : null}
        </div>
        {meta ? <div className="md:ml-auto">{meta}</div> : null}
      </div>

      {title || subtitle ? (
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          {title ? (
            <div className="text-sm font-semibold leading-snug">
              <p>{title}</p>
              {subtitle ? <p className="mt-1 text-xs font-normal text-gray-900/80">{subtitle}</p> : null}
            </div>
          ) : null}
          {meta ? <div className="ml-auto">{meta}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

type StepPanelBodyProps = {
  children: ReactNode
  className?: string
}

export function StepPanelBody({ children, className }: StepPanelBodyProps) {
  return <div className={`px-5 py-5 ${className ?? ''}`}>{children}</div>
}

type StepPanelMetaProps = {
  label: string
  value: ReactNode
}

export function StepPanelMeta({ label, value }: StepPanelMetaProps) {
  return (
    <div className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-900/60">
      <div>{label}</div>
      <div className="mt-1 text-base font-bold text-gray-900 uppercase tracking-widest">{value}</div>
    </div>
  )
}

type StepPanelSectionProps = {
  label?: string
  children: ReactNode
  action?: ReactNode
  className?: string
  muted?: boolean
}

export function StepPanelSection({ label, children, action, className, muted }: StepPanelSectionProps) {
  return (
    <div
      className={`rounded-3xl border ${
        muted ? 'border-gray-100 bg-white/70' : 'border-gray-200 bg-white/90'
      } px-5 py-4 shadow-sm backdrop-blur ${className ?? ''}`}
    >
      {label || action ? (
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <span>{label}</span>
          {action}
        </div>
      ) : null}
      <div className={`${label || action ? 'mt-3' : ''} text-sm text-gray-900`}>{children}</div>
    </div>
  )
}
