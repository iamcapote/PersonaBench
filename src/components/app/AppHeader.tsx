import { Flask } from "@phosphor-icons/react"

export function AppHeader() {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <Flask size={36} className="text-primary drop-shadow-sm" />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">PersonaBench</h1>
        <p className="text-sm text-ink-600">
          Benchmark markdown personas across diverse scenarios with blended algorithmic and human evaluation.
        </p>
      </div>
    </div>
  )
}
