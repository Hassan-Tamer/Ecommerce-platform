import { useSyncExternalStore } from 'react'

let preview = null
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

export function setAvatarPreview(next) {
  preview = next || null
  emit()
}

export function clearAvatarPreview() {
  if (!preview) return
  preview = null
  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAvatarPreview() {
  return useSyncExternalStore(subscribe, () => preview, () => null)
}
