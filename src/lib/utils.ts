export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function downloadJsonFile(filename: string, payload: unknown): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return
  }

  const sanitized = filename.endsWith(".json") ? filename : `${filename}.json`
  const content = JSON.stringify(payload, null, 2)
  const blob = new Blob([content], { type: "application/json" })
  const url = window.URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = sanitized
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  window.URL.revokeObjectURL(url)
}
