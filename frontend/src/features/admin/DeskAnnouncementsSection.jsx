import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createAnnouncement,
  deleteAnnouncement,
  listAdminAnnouncements,
  updateAnnouncement,
} from '../announcements/api/announcementsApi'
import Button from '../../components/Button'
import '../../pages/AdminProductsPage.css'
import './DeskAnnouncementsSection.css'

const EMPTY_FORM = {
  title: '',
  description: '',
  active: true,
  starts_at: '',
  ends_at: '',
}

function toDatetimeLocal(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(value) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return { error: 'Enter a valid date and time.' }
  return { value: date.toISOString() }
}

function readForm(form) {
  const title = form.title.trim()
  const description = form.description.trim()

  if (!title) return { error: 'Enter a title.' }
  if (!description) return { error: 'Enter a description.' }

  const starts = toIso(form.starts_at)
  if (starts?.error) return { error: 'Enter a valid start time.' }
  const ends = toIso(form.ends_at)
  if (ends?.error) return { error: 'Enter a valid end time.' }

  return {
    title,
    description,
    active: Boolean(form.active),
    starts_at: starts?.value ?? null,
    ends_at: ends?.value ?? null,
  }
}

function formatWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function bySortOrder(a, b) {
  return a.sort_order - b.sort_order || a.id - b.id
}

function DeleteAnnouncementDialog({ row, busy, onCancel, onConfirm }) {
  const cancelRef = useRef(onCancel)
  const busyRef = useRef(busy)
  cancelRef.current = onCancel
  busyRef.current = busy

  useEffect(() => {
    const previous = document.activeElement
    const onKey = (event) => {
      if (event.key === 'Escape' && !busyRef.current) cancelRef.current()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  return createPortal(
    <div
      className="announcements-desk__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        className="announcements-desk__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-announcement-title"
        aria-describedby="delete-announcement-body"
      >
        <h2 id="delete-announcement-title">Delete this announcement?</h2>
        <p id="delete-announcement-body">
          <strong>{row.title}</strong> will be removed from the desk and the shop.
        </p>
        <div className="announcements-desk__dialog-actions">
          <button
            type="button"
            className="announcements-desk__dialog-cancel"
            onClick={onCancel}
            disabled={busy}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="announcements-desk__dialog-delete"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function DeskAnnouncementsSection() {
  const [rows, setRows] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [activeFilter, setActiveFilter] = useState('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [dragId, setDragId] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const [reordering, setReordering] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const canReorder = activeFilter === 'all'
  const sortedRows = useMemo(() => [...rows].sort(bySortOrder), [rows])

  const loadRows = useCallback(() => {
    const active =
      activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined
    setLoadState('loading')
    return listAdminAnnouncements({ active })
      .then((data) => {
        setRows(Array.isArray(data) ? data : [])
        setLoadState('ready')
      })
      .catch((error) => {
        setMessage(error.message || 'Could not load announcements.')
        setLoadState('error')
      })
  }, [activeFilter])

  useEffect(() => {
    const controller = new AbortController()
    const active =
      activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined
    setLoadState('loading')
    listAdminAnnouncements({ active, signal: controller.signal })
      .then((data) => {
        setRows(Array.isArray(data) ? data : [])
        setLoadState('ready')
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        setMessage(error.message || 'Could not load announcements.')
        setLoadState('error')
      })
    return () => controller.abort()
  }, [activeFilter])

  function updateField(key) {
    return (event) => {
      const { type, checked, value } = event.target
      setForm((current) => ({
        ...current,
        [key]: type === 'checkbox' ? checked : value,
      }))
      setMessage('')
    }
  }

  function startEdit(row) {
    setEditingId(row.id)
    setForm({
      title: row.title,
      description: row.description,
      active: row.active,
      starts_at: toDatetimeLocal(row.starts_at),
      ends_at: toDatetimeLocal(row.ends_at),
    })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMessage('')
  }

  async function onSubmit(event) {
    event.preventDefault()
    const parsed = readForm(form)
    if (parsed.error) {
      setMessage(parsed.error)
      return
    }

    try {
      if (editingId != null) {
        await updateAnnouncement(editingId, parsed)
        cancelEdit()
      } else {
        await createAnnouncement(parsed)
        setForm(EMPTY_FORM)
        setMessage('')
      }
      await loadRows()
    } catch (error) {
      setMessage(error.message || 'Save failed.')
    }
  }

  async function confirmRemove() {
    const row = pendingDelete
    if (!row || deleting) return
    setDeleting(true)
    setMessage('')
    try {
      await deleteAnnouncement(row.id)
      if (editingId === row.id) cancelEdit()
      setPendingDelete(null)
      await loadRows()
    } catch (error) {
      setMessage(error.message || 'Delete failed.')
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  async function moveToIndex(fromIndex, toIndex) {
    if (!canReorder || fromIndex === toIndex || reordering) return

    const ordered = [...sortedRows]
    const moved = ordered[fromIndex]
    if (!moved) return

    setReordering(true)
    setMessage('')
    try {
      await updateAnnouncement(moved.id, { sort_order: toIndex })
      await loadRows()
    } catch (error) {
      setMessage(error.message || 'Could not reorder.')
    } finally {
      setReordering(false)
      setDragId(null)
      setDropIndex(null)
    }
  }

  function onDragStart(event, row) {
    if (!canReorder || reordering) return
    setDragId(row.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(row.id))

    const source = event.currentTarget.closest('.announcements-desk__row')
    if (!source) return
    const rect = source.getBoundingClientRect()
    const handle = event.currentTarget.getBoundingClientRect()
    const ghost = source.cloneNode(true)
    ghost.classList.add('announcements-desk__ghost')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.style.width = `${rect.width}px`
    document.body.appendChild(ghost)
    event.dataTransfer.setDragImage(
      ghost,
      handle.left - rect.left + handle.width / 2,
      handle.top - rect.top + handle.height / 2,
    )
    window.setTimeout(() => ghost.remove(), 0)
  }

  function onDragEnd() {
    setDragId(null)
    setDropIndex(null)
  }

  function onDragOver(event, index) {
    if (!canReorder || dragId == null) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const fromIndex = sortedRows.findIndex((item) => item.id === dragId)
    setDropIndex(fromIndex === index ? null : index)
  }

  function onDrop(event, toIndex) {
    event.preventDefault()
    if (!canReorder || dragId == null) return
    const fromIndex = sortedRows.findIndex((row) => row.id === dragId)
    if (fromIndex < 0) return
    moveToIndex(fromIndex, toIndex)
  }

  return (
    <div className="announcements-desk">
      <div className="announcements-desk__filter">
        <span className="announcements-desk__filter-label">Show</span>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'inactive', label: 'Inactive' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              activeFilter === option.id
                ? 'announcements-desk__filter-btn is-active'
                : 'announcements-desk__filter-btn'
            }
            onClick={() => {
              setActiveFilter(option.id)
              setMessage('')
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="products__layout announcements-desk__layout">
        <section className="products__card">
          <h3 className="announcements-desk__panel-title">
            {editingId == null ? 'New announcement' : 'Edit announcement'}
          </h3>
          <form className="products__form" onSubmit={onSubmit}>
            <label className="products__field" htmlFor="announcement-title">
              Title
              <input
                id="announcement-title"
                value={form.title}
                onChange={updateField('title')}
                autoComplete="off"
              />
            </label>
            <label className="products__field" htmlFor="announcement-description">
              Description
              <textarea
                id="announcement-description"
                rows={4}
                value={form.description}
                onChange={updateField('description')}
              />
            </label>
            <label className="products__field" htmlFor="announcement-starts">
              Starts at (optional)
              <input
                id="announcement-starts"
                type="datetime-local"
                value={form.starts_at}
                onChange={updateField('starts_at')}
              />
            </label>
            <label className="products__field" htmlFor="announcement-ends">
              Ends at (optional)
              <input
                id="announcement-ends"
                type="datetime-local"
                value={form.ends_at}
                onChange={updateField('ends_at')}
              />
            </label>
            <label className="products__field products__field--row" htmlFor="announcement-active">
              <input
                id="announcement-active"
                type="checkbox"
                checked={form.active}
                onChange={updateField('active')}
              />
              Active on shop
            </label>
            {message ? (
              <p className="products__message" role="alert">
                {message}
              </p>
            ) : null}
            <div className="products__submit">
              <Button type="submit">{editingId == null ? 'Add announcement' : 'Save announcement'}</Button>
              {editingId != null ? (
                <button type="button" className="products__text" onClick={cancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="products__card announcements-desk__catalog">
          <h3 className="announcements-desk__panel-title">All announcements</h3>
          {canReorder ? (
            <p className="announcements-desk__hint">Drag the handle to set the shop order.</p>
          ) : (
            <p className="announcements-desk__hint">Show All to drag and reorder.</p>
          )}
          {loadState === 'loading' ? (
            <p className="products__empty">Loading…</p>
          ) : sortedRows.length === 0 ? (
            <p className="products__empty">No announcements match this filter.</p>
          ) : (
            <ul
              className={
                dragId == null
                  ? 'products__list announcements-desk__list'
                  : 'products__list announcements-desk__list is-sorting'
              }
              onDragOver={(event) => {
                if (!canReorder || dragId == null) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
            >
              {sortedRows.map((row, index) => (
                <li
                  key={row.id}
                  className={[
                    'products__row',
                    'announcements-desk__row',
                    dragId === row.id ? 'is-dragging' : '',
                    dropIndex === index ? 'is-drop-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onDragOver={(event) => onDragOver(event, index)}
                  onDrop={(event) => onDrop(event, index)}
                >
                  <button
                    type="button"
                    className="announcements-desk__handle"
                    draggable={canReorder && !reordering}
                    aria-label={`Drag to reorder, currently position ${row.sort_order}`}
                    disabled={!canReorder || reordering}
                    onDragStart={(event) => onDragStart(event, row)}
                    onDragEnd={onDragEnd}
                  >
                    <svg viewBox="0 0 10 16" aria-hidden="true">
                      <circle cx="2" cy="2.5" r="1.15" />
                      <circle cx="8" cy="2.5" r="1.15" />
                      <circle cx="2" cy="8" r="1.15" />
                      <circle cx="8" cy="8" r="1.15" />
                      <circle cx="2" cy="13.5" r="1.15" />
                      <circle cx="8" cy="13.5" r="1.15" />
                    </svg>
                  </button>
                  <div className="products__identity">
                    <strong>{row.title}</strong>
                    <span className="announcements-desk__meta">
                      {row.active ? (
                        <span className="announcements-desk__badge announcements-desk__badge--on">Active</span>
                      ) : (
                        <span className="announcements-desk__badge">Inactive</span>
                      )}
                      <span>#{row.sort_order}</span>
                    </span>
                    <span className="products__blurb">{row.description}</span>
                    <span className="announcements-desk__schedule">
                      {formatWhen(row.starts_at)} → {formatWhen(row.ends_at)}
                    </span>
                  </div>
                  <div className="products__actions">
                    <button type="button" className="products__edit" onClick={() => startEdit(row)}>
                      Edit
                    </button>
                    <button type="button" className="products__text" onClick={() => setPendingDelete(row)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {pendingDelete ? (
        <DeleteAnnouncementDialog
          row={pendingDelete}
          busy={deleting}
          onCancel={() => {
            if (!deleting) setPendingDelete(null)
          }}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  )
}