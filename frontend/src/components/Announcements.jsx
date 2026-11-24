import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { listAnnouncements } from '../features/announcements/api/announcementsApi'
import './Announcements.css'

const VISIBLE_COUNT = 3
const ROTATE_MS = 8_000
const SLIDE_MS = 700

function slicePage(items, page) {
  if (items.length === 0) return []
  if (items.length <= VISIBLE_COUNT) return items
  const start = page * VISIBLE_COUNT
  const slice = []
  for (let i = 0; i < VISIBLE_COUNT; i += 1) {
    slice.push(items[(start + i) % items.length])
  }
  return slice
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function AnnouncementCards({ notices }) {
  return notices.map((notice) => (
    <li key={notice.id} className="announcements__card">
      <h2 className="announcements__title">{notice.title}</h2>
      <p className="announcements__body">{notice.description}</p>
    </li>
  ))
}

export default function Announcements() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [index, setIndex] = useState(0)
  const [motion, setMotion] = useState(true)
  const [paused, setPaused] = useState(false)
  const [timerKey, setTimerKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    listAnnouncements({ signal: controller.signal })
      .then((rows) => {
        setItems(Array.isArray(rows) ? rows : [])
        setIndex(0)
        setStatus('ready')
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        setItems([])
        setStatus('error')
      })
    return () => controller.abort()
  }, [])

  const pageCount = useMemo(() => {
    if (items.length === 0) return 0
    return Math.max(1, Math.ceil(items.length / VISIBLE_COUNT))
  }, [items.length])

  const slides = useMemo(() => {
    if (pageCount === 0) return []
    const pages = Array.from({ length: pageCount }, (_, page) => slicePage(items, page))
    if (pageCount > 1) pages.push(slicePage(items, 0))
    return pages
  }, [items, pageCount])

  const active = pageCount > 0 ? index % pageCount : 0

  useEffect(() => {
    if (paused || pageCount < 2) return undefined
    const id = window.setInterval(() => {
      setMotion(true)
      setIndex((current) => (current >= pageCount ? 1 : current + 1))
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [paused, pageCount, timerKey])

  useLayoutEffect(() => {
    if (pageCount < 2 || index < pageCount) return undefined
    const delay = prefersReducedMotion() ? 0 : SLIDE_MS
    const id = window.setTimeout(() => {
      setMotion(false)
      setIndex(0)
    }, delay)
    return () => window.clearTimeout(id)
  }, [index, pageCount])

  useLayoutEffect(() => {
    if (motion) return undefined
    let second = 0
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setMotion(true))
    })
    return () => {
      window.cancelAnimationFrame(first)
      window.cancelAnimationFrame(second)
    }
  }, [motion])

  function showPage(next) {
    if (next === active || pageCount < 2) return
    setMotion(true)
    setIndex(next)
    setTimerKey((current) => current + 1)
  }

  function hold() {
    setPaused(true)
  }

  function release(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    setPaused(false)
  }

  if (status === 'loading') {
    return (
      <section className="announcements" aria-label="Announcements" aria-busy="true">
        <p className="announcements__status">Loading announcements…</p>
      </section>
    )
  }

  if (status === 'error' || items.length === 0) {
    return null
  }

  const rotating = pageCount > 1

  return (
    <section
      className="announcements"
      aria-label="Announcements"
      aria-roledescription={rotating ? 'carousel' : undefined}
      onMouseEnter={rotating ? hold : undefined}
      onMouseLeave={rotating ? release : undefined}
      onFocusCapture={rotating ? hold : undefined}
      onBlurCapture={rotating ? release : undefined}
    >
      <div className="announcements__viewport">
        <div
          className={motion ? 'announcements__track is-animated' : 'announcements__track'}
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((notices, slideIndex) => (
            <ul
              key={slideIndex}
              className="announcements__list"
              aria-hidden={rotating && slideIndex !== index ? true : undefined}
            >
              <AnnouncementCards notices={notices} />
            </ul>
          ))}
        </div>
      </div>
      {rotating ? (
        <div className="announcements__dots" role="tablist" aria-label="Announcement pages">
          {Array.from({ length: pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              role="tab"
              className={page === active ? 'announcements__dot is-active' : 'announcements__dot'}
              aria-selected={page === active}
              aria-label={`Show announcements ${page * VISIBLE_COUNT + 1} to ${Math.min((page + 1) * VISIBLE_COUNT, items.length)}`}
              onClick={() => showPage(page)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
