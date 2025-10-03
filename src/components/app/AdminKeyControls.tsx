import { useEffect, useState, type FormEvent } from "react"
import { CheckCircle, Key, Warning } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"

const FIELD_ID = "admin-key-input"

export function AdminKeyControls() {
  const { adminKey, hasAdminAccess, setAdminKey, clearAdminKey, initialized } = useAdminAuth()
  const [draftKey, setDraftKey] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (initialized) {
      setDraftKey(adminKey)
    }
  }, [adminKey, initialized])

  const startEditing = () => {
    setIsEditing(true)
    setDraftKey(adminKey)
    queueMicrotask(() => {
      const field = document.getElementById(FIELD_ID) as HTMLInputElement | null
      field?.focus()
      field?.select()
    })
  }

  const handleSave = (event: FormEvent) => {
    event.preventDefault()
    setAdminKey(draftKey)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setDraftKey(adminKey)
  }

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {hasAdminAccess ? (
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle size={16} />
            Admin key active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <Warning size={16} />
            Set admin key to enable saves
          </span>
        )}
        <Button variant="outline" size="sm" onClick={startEditing}
          className="gap-1">
          <Key size={14} />
          {hasAdminAccess ? "Update" : "Set"}
        </Button>
        {hasAdminAccess && (
          <Button variant="ghost" size="sm" onClick={clearAdminKey}>
            Clear
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex flex-wrap items-center gap-2 text-sm">
      <Input
        id={FIELD_ID}
        type="password"
        value={draftKey}
        className="w-48"
        onChange={(event) => setDraftKey(event.target.value)}
        placeholder="Enter admin key"
        autoComplete="off"
      />
      <Button size="sm" type="submit" className="gap-1">
        <CheckCircle size={14} />
        Save
      </Button>
      <Button size="sm" type="button" variant="ghost" onClick={handleCancel}>
        Cancel
      </Button>
    </form>
  )
}
