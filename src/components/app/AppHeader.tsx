import { Flask } from "@phosphor-icons/react"

import { AdminKeyControls } from "@/components/app/AdminKeyControls"

export function AppHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Flask size={36} className="text-primary drop-shadow-sm" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">PersonaBench</h1>
          <p className="text-sm text-ink-600">
            Benchmark markdown personas across diverse scenarios with blended algorithmic and human evaluation.
          </p>
        </div>
      </div>
      <AdminKeyControls />
    </div>
  )
}
