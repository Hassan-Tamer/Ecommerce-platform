import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatPrice } from '../catalog/api/productsApi'
import { createCoupon, deleteCoupon, listAdminCoupons, updateCoupon } from '../coupons/api/couponsApi'
import Button from '../../components/Button'
import '../../pages/AdminProductsPage.css'
import './DeskCouponsSection.css'

const EMPTY_FORM = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  min_subtotal: '',
  max_discount: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
  usage_limit: '',
  per_user_limit: '',
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

function optionalNumber(value, label, { integer = false, min = 0 } = {}) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < min || (integer && !Number.isInteger(amount))) {
    return { error: `Enter a valid ${label}.` }
  }
  return { value: amount }
}

function readForm(form) {
  const code = form.code.trim()
  if (!code) return { error: 'Enter a code.' }

  const discount = optionalNumber(form.discount_value, 'discount')
  if (!discount || discount.error) return { error: discount?.error || 'Enter a discount.' }
  if (form.discount_type === 'percent' && discount.value > 100) {
    return { error: 'A percent discount cannot be more than 100.' }
  }

  const minSubtotal = optionalNumber(form.min_subtotal, 'minimum subtotal')
  if (minSubtotal?.error) return { error: minSubtotal.error }
  const maxDiscount =
    form.discount_type === 'percent' ? optionalNumber(form.max_discount, 'maximum discount') : null
  if (maxDiscount?.error) return { error: maxDiscount.error }

  const starts = toIso(form.starts_at)
  if (starts?.error) return { error: 'Enter a valid start time.' }
  const ends = toIso(form.ends_at)
  if (ends?.error) return { error: 'Enter a valid end time.' }
  if (starts?.value && ends?.value && starts.value > ends.value) {
    return { error: 'The start time must be before the end time.' }
  }

  const usage = optionalNumber(form.usage_limit, 'usage limit', { integer: true, min: 1 })
  if (usage?.error) return { error: usage.error }
  const perUser = optionalNumber(form.per_user_limit, 'per-customer limit', { integer: true, min: 1 })
  if (perUser?.error) return { error: perUser.error }

  return {
    code,
    discount_type: form.discount_type,
    discount_value: discount.value,
    min_subtotal: minSubtotal?.value ?? null,
    max_discount: form.discount_type === 'percent' ? (maxDiscount?.value ?? null) : null,
    starts_at: starts?.value ?? null,
    ends_at: ends?.value ?? null,
    is_active: Boolean(form.is_active),
    usage_limit: usage?.value ?? null,
    per_user_limit: perUser?.value ?? null,
  }
}

function discountLabel(row) {
  if (row.discount_type === 'percent') {
    const cap = row.max_discount != null ? `, up to ${formatPrice(Number(row.max_discount))}` : ''
    return `${Number(row.discount_value)}% off${cap}`
  }
  return `${formatPrice(Number(row.discount_value))} off`
}

function formatWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function DeleteCouponDialog({ coupon, busy, onCancel, onConfirm }) {
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
      className="coupons-desk__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        className="coupons-desk__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-coupon-title"
        aria-describedby="delete-coupon-body"
      >
        <h2 id="delete-coupon-title">Delete this coupon?</h2>
        <p id="delete-coupon-body">
          <strong>{coupon.code}</strong> will no longer apply at checkout.
        </p>
        <div className="coupons-desk__dialog-actions">
          <button type="button" className="coupons-desk__dialog-cancel" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="coupons-desk__dialog-delete" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function DeskCouponsSection() {
  const [rows, setRows] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [activeFilter, setActiveFilter] = useState('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const loadRows = useCallback(() => {
    setLoadState('loading')
    return listAdminCoupons()
      .then((data) => {
        setRows(Array.isArray(data) ? data : [])
        setLoadState('ready')
      })
      .catch((error) => {
        setLoadState('error')
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoadState('loading')
    listAdminCoupons({ signal: controller.signal })
      .then((data) => {
        setRows(Array.isArray(data) ? data : [])
        setLoadState('ready')
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        setLoadState('error')
      })
    return () => controller.abort()
  }, [])

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeFilter === 'active') return row.is_active
      if (activeFilter === 'inactive') return !row.is_active
      return true
    })
  }, [rows, activeFilter])

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
      code: row.code,
      discount_type: row.discount_type,
      discount_value: String(row.discount_value ?? ''),
      min_subtotal: row.min_subtotal == null ? '' : String(row.min_subtotal),
      max_discount: row.max_discount == null ? '' : String(row.max_discount),
      starts_at: toDatetimeLocal(row.starts_at),
      ends_at: toDatetimeLocal(row.ends_at),
      is_active: row.is_active,
      usage_limit: row.usage_limit == null ? '' : String(row.usage_limit),
      per_user_limit: row.per_user_limit == null ? '' : String(row.per_user_limit),
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
      if (editingId == null) {
        await createCoupon(parsed)
        setForm(EMPTY_FORM)
      } else {
        await updateCoupon(editingId, parsed)
        cancelEdit()
      }
      setMessage('')
      await loadRows()
    } catch (error) {
      setMessage(error.message || 'Save failed.')
    }
  }

  async function toggleActive(row) {
    if (togglingId != null) return
    setTogglingId(row.id)
    setMessage('')
    try {
      const updated = await updateCoupon(row.id, { is_active: !row.is_active })
      setRows((current) => current.map((item) => (item.id === row.id ? updated : item)))
      if (editingId === row.id) {
        setForm((current) => ({ ...current, is_active: Boolean(updated.is_active) }))
      }
    } catch (error) {
      setMessage(error.message || 'Could not update this coupon.')
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmRemove() {
    const row = pendingDelete
    if (!row || deleting) return
    setDeleting(true)
    setMessage('')
    try {
      await deleteCoupon(row.id)
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

  return (
    <div className="coupons-desk">
      <div className="coupons-desk__filter">
        <span className="coupons-desk__filter-label">Show</span>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'inactive', label: 'Inactive' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              activeFilter === option.id ? 'coupons-desk__filter-btn is-active' : 'coupons-desk__filter-btn'
            }
            onClick={() => setActiveFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="products__layout coupons-desk__layout">
        <section className="products__card">
          <h3 className="coupons-desk__panel-title">{editingId == null ? 'New coupon' : 'Edit coupon'}</h3>
          <form className="products__form" onSubmit={onSubmit}>
            <div className="coupons-desk__fields">
              <label className="products__field" htmlFor="coupon-code">
                Code
                <input
                  id="coupon-code"
                  className="coupons-desk__code-input"
                  value={form.code}
                  onChange={updateField('code')}
                  autoComplete="off"
                  spellCheck="false"
                />
              </label>
              <label className="products__field" htmlFor="coupon-type">
                Discount
                <select id="coupon-type" value={form.discount_type} onChange={updateField('discount_type')}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label className="products__field" htmlFor="coupon-value">
                {form.discount_type === 'percent' ? 'Percent off' : 'Amount off'}
                <input
                  id="coupon-value"
                  inputMode="decimal"
                  value={form.discount_value}
                  onChange={updateField('discount_value')}
                />
              </label>
              <label className="products__field" htmlFor="coupon-min">
                Minimum subtotal
                <input
                  id="coupon-min"
                  inputMode="decimal"
                  value={form.min_subtotal}
                  onChange={updateField('min_subtotal')}
                  placeholder="Optional"
                />
              </label>
              {form.discount_type === 'percent' ? (
                <label className="products__field" htmlFor="coupon-max">
                  Maximum discount
                  <input
                    id="coupon-max"
                    inputMode="decimal"
                    value={form.max_discount}
                    onChange={updateField('max_discount')}
                    placeholder="Optional"
                  />
                </label>
              ) : null}
              <label className="products__field" htmlFor="coupon-usage">
                Total uses
                <input
                  id="coupon-usage"
                  inputMode="numeric"
                  value={form.usage_limit}
                  onChange={updateField('usage_limit')}
                  placeholder="Unlimited"
                />
              </label>
              <label className="products__field" htmlFor="coupon-per-user">
                Uses per customer
                <input
                  id="coupon-per-user"
                  inputMode="numeric"
                  value={form.per_user_limit}
                  onChange={updateField('per_user_limit')}
                  placeholder="Unlimited"
                />
              </label>
              <label className="products__field" htmlFor="coupon-starts">
                Starts at
                <input
                  id="coupon-starts"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={updateField('starts_at')}
                />
              </label>
              <label className="products__field" htmlFor="coupon-ends">
                Ends at
                <input id="coupon-ends" type="datetime-local" value={form.ends_at} onChange={updateField('ends_at')} />
              </label>
            </div>
            <label className="products__field products__field--row" htmlFor="coupon-active">
              <input id="coupon-active" type="checkbox" checked={form.is_active} onChange={updateField('is_active')} />
              Active at checkout
            </label>
            {message ? (
              <p className="products__message" role="alert">
                {message}
              </p>
            ) : null}
            <div className="products__submit">
              <Button type="submit">{editingId == null ? 'Add coupon' : 'Save coupon'}</Button>
              {editingId != null ? (
                <button type="button" className="products__text" onClick={cancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="products__card coupons-desk__catalog">
          <h3 className="coupons-desk__panel-title">All coupons</h3>
          {loadState === 'loading' ? (
            <p className="products__empty">Loading…</p>
          ) : visibleRows.length === 0 ? (
            <p className="products__empty">
              {loadState === 'error' ? 'Coupons could not be loaded.' : 'No coupons match this filter.'}
            </p>
          ) : (
            <ul className="coupons-desk__list">
              {visibleRows.map((row) => (
                <li key={row.id} className="coupons-desk__row">
                  <div>
                    <strong className="coupons-desk__code">{row.code}</strong>
                    <span className="coupons-desk__meta">
                      <button
                        type="button"
                        className={row.is_active ? 'coupons-desk__status is-on' : 'coupons-desk__status'}
                        aria-pressed={row.is_active}
                        aria-label={row.is_active ? `Deactivate ${row.code}` : `Activate ${row.code}`}
                        disabled={togglingId === row.id}
                        onClick={() => toggleActive(row)}
                      >
                        {row.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <span>{discountLabel(row)}</span>
                      {row.min_subtotal != null ? <span>Min {formatPrice(Number(row.min_subtotal))}</span> : null}
                    </span>
                    <span className="coupons-desk__schedule">
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
        <DeleteCouponDialog
          coupon={pendingDelete}
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
