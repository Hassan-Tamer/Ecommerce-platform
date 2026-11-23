import { useEffect, useId, useRef, useState } from 'react'
import { notImplemented } from '../lib/notImplemented'
import Icon from './icons'
import './Assistant.css'

export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const titleId = useId()
  const panelId = useId()
  const toggleRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    function onKey(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        requestAnimationFrame(() => toggleRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    setOpen(false)
    requestAnimationFrame(() => toggleRef.current?.focus())
  }

  function send(event) {
    event.preventDefault()
    if (!message.trim()) return
    notImplemented('The assistant')
  }

  return (
    <div className={open ? 'assistant is-open' : 'assistant'}>
      <button
        ref={toggleRef}
        type="button"
        className="assistant__toggle"
        hidden={open}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <span className="assistant__mark" aria-hidden="true">
          <Icon name="chat" />
        </span>
        <span className="assistant__copy">
          <span className="assistant__title">Shop assistant</span>
          <span className="assistant__hint">Help with a product or an order</span>
        </span>
      </button>

      <section
        id={panelId}
        className="assistant__panel"
        hidden={!open}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
      >
        <header className="assistant__head">
          <div>
            <h2 id={titleId}>Shop assistant</h2>
            <p>Products, orders, and the shop.</p>
          </div>
          <button type="button" className="assistant__close" aria-label="Close shop assistant" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="assistant__thread">
          <p className="assistant__bubble">
            Tell me what you are looking for, or ask about an order.
          </p>
        </div>
        <form className="assistant__composer" onSubmit={send}>
          <label className="visually-hidden" htmlFor="assistant-message">
            Message
          </label>
          <textarea
            ref={inputRef}
            id="assistant-message"
            rows={2}
            placeholder="Write a message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button type="submit" className="assistant__send">
            Send
          </button>
        </form>
      </section>
    </div>
  )
}
