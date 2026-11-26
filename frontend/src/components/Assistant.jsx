import { useEffect, useId, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { sendAssistantMessage } from '../features/assistant/assistantApi'
import { prepareAssistantMarkdown } from '../features/assistant/markdown'
import Icon from './icons'
import './Assistant.css'

function MarkdownLink({ href, children }) {
  const external = /^https?:/i.test(href || '')
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
      {children}
    </a>
  )
}

function AssistantMarkdown({ text }) {
  return (
    <div className="assistant__bubble assistant__markdown">
      <Markdown remarkPlugins={[remarkBreaks]} components={{ a: MarkdownLink }}>
        {prepareAssistantMarkdown(text)}
      </Markdown>
    </div>
  )
}

const WELCOME =
  'Tell me what you are looking for, or ask about an order. (I can chat for now — catalog and order lookup come later.)'

export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [thread, setThread] = useState([{ role: 'assistant', text: WELCOME }])
  const titleId = useId()
  const panelId = useId()
  const toggleRef = useRef(null)
  const inputRef = useRef(null)
  const threadEndRef = useRef(null)

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

  useEffect(() => {
    if (!open) return
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [open, thread, sending])

  function close() {
    setOpen(false)
    requestAnimationFrame(() => toggleRef.current?.focus())
  }

  function onComposerKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send(event)
  }

  async function send(event) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setError('')
    setMessage('')
    setThread((items) => [...items, { role: 'user', text: trimmed }])
    setSending(true)

    try {
      const data = await sendAssistantMessage(trimmed)
      const reply = typeof data?.reply === 'string' ? data.reply.trim() : ''
      if (!reply) {
        setError('No reply from the assistant. Try again.')
        return
      }
      setThread((items) => [...items, { role: 'assistant', text: reply }])
    } catch (err) {
      setError(err?.message || 'Could not reach the assistant.')
    } finally {
      setSending(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
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
          <span className="assistant__live" />
        </span>
        <span className="assistant__copy">
          <span className="assistant__title">Shop assistant</span>
          <span className="assistant__hint">Ask about a product or order</span>
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
          <span className="assistant__avatar" aria-hidden="true">
            <Icon name="chat" />
            <span className="assistant__live" />
          </span>
          <div className="assistant__identity">
            <h2 id={titleId}>Shop assistant</h2>
            <p>Online now</p>
          </div>
          <button type="button" className="assistant__close" aria-label="Close shop assistant" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="assistant__thread" aria-live="polite">
          {thread.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={
                entry.role === 'user'
                  ? 'assistant__message assistant__message--user'
                  : 'assistant__message'
              }
            >
              {entry.role === 'assistant' ? (
                <span className="assistant__avatar assistant__avatar--sm" aria-hidden="true">
                  <Icon name="chat" />
                </span>
              ) : null}
              {entry.role === 'assistant' ? (
                <AssistantMarkdown text={entry.text} />
              ) : (
                <p className="assistant__bubble">{entry.text}</p>
              )}
            </div>
          ))}
          {sending ? (
            <div className="assistant__message" aria-busy="true">
              <span className="assistant__avatar assistant__avatar--sm" aria-hidden="true">
                <Icon name="chat" />
              </span>
              <p className="assistant__bubble assistant__bubble--typing">Thinking…</p>
            </div>
          ) : null}
          {error ? (
            <p className="assistant__error" role="alert">
              {error}
            </p>
          ) : null}
          <div ref={threadEndRef} />
        </div>
        <form className="assistant__composer" onSubmit={send}>
          <label className="visually-hidden" htmlFor="assistant-message">
            Message
          </label>
          <textarea
            ref={inputRef}
            id="assistant-message"
            rows={1}
            placeholder="Write a message"
            value={message}
            disabled={sending}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={onComposerKeyDown}
          />
          <button
            type="submit"
            className="assistant__send"
            aria-label="Send message"
            disabled={sending || !message.trim()}
          >
            <Icon name="send" />
          </button>
        </form>
      </section>
    </div>
  )
}