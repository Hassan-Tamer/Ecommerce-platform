import { useEffect, useId, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { useNavigate } from 'react-router-dom'
import { sendAssistantMessage } from '../features/assistant/assistantApi'
import { prepareAssistantMarkdown } from '../features/assistant/markdown'
import { formatPrice, getProduct } from '../features/catalog/api/productsApi'
import { addCartItem, removeCartItem } from '../features/cart/api/cartApi'
import { useCart } from '../features/cart/CartContext'
import { addToWishlist, removeFromWishlist } from '../features/wishlist/api/wishlistApi'
import { useWishlist } from '../features/wishlist/WishlistContext'
import Icon from './icons'
import './Assistant.css'

const PAGES = {
  orders: '/orders',
  wishlist: '/wishlist',
  shop: '/',
  profile: '/account',
}

const CONFIRM_TYPES = new Set([
  'add_to_cart',
  'remove_from_cart',
  'add_to_wishlist',
  'remove_from_wishlist',
])

const ACTION_RANK = {
  view_product: 0,
  add_to_cart: 1,
  add_to_wishlist: 2,
  remove_from_cart: 3,
  remove_from_wishlist: 4,
  navigate: 5,
}

const SLUG = /^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/

function asActions(raw) {
  if (!Array.isArray(raw)) return []
  const actions = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const type = item.type
    const label = typeof item.label === 'string' ? item.label.trim() : ''
    if (!label) continue
    if (type === 'navigate' && PAGES[item.page]) {
      actions.push({ type, label, page: item.page, status: 'idle', error: '' })
      continue
    }
    if (type === 'view_product') {
      const slug = typeof item.slug === 'string' ? item.slug.trim().replace(/^\/+|\/+$/g, '') : ''
      const productId = Number(item.product_id)
      if (!SLUG.test(slug) || !Number.isInteger(productId) || productId < 1) continue
      actions.push({ type, label, slug, productId, status: 'idle', error: '' })
      if (actions.length >= 9) break
      continue
    }
    if (!CONFIRM_TYPES.has(type)) continue
    const productId = Number(item.product_id)
    if (!Number.isInteger(productId) || productId < 1) continue
    const action = { type, label, productId, status: 'idle', error: '' }
    if (type === 'add_to_cart') {
      const quantity = Number(item.quantity)
      action.quantity = Number.isInteger(quantity) && quantity > 0 ? Math.min(quantity, 99) : 1
    }
    actions.push(action)
    if (actions.length >= 9) break
  }
  return actions
}

function actionGroups(actions) {
  const groups = []
  const indexByProduct = new Map()
  actions.forEach((action, actionIndex) => {
    const key = action.productId ? `p-${action.productId}` : `a-${actionIndex}`
    if (!indexByProduct.has(key)) {
      indexByProduct.set(key, groups.length)
      groups.push([])
    }
    groups[indexByProduct.get(key)].push({ action, actionIndex })
  })
  for (const group of groups) {
    group.sort((a, b) => (ACTION_RANK[a.action.type] ?? 9) - (ACTION_RANK[b.action.type] ?? 9))
  }
  return groups
}

function actionTone(type) {
  if (type === 'add_to_cart') return 'assistant__action assistant__action--cart'
  if (type === 'add_to_wishlist') return 'assistant__action assistant__action--save'
  if (type === 'view_product') return 'assistant__action assistant__action--view'
  if (type.startsWith('remove')) return 'assistant__action assistant__action--remove'
  return 'assistant__action'
}

function actionIcon(type) {
  if (type === 'add_to_cart' || type === 'remove_from_cart') return 'cart'
  if (type === 'add_to_wishlist' || type === 'remove_from_wishlist') return 'heart'
  if (type === 'view_product') return 'products'
  return null
}

function actionLabel(action) {
  if (action.status === 'pending') return 'Working…'
  if (action.status !== 'done') return action.label
  if (action.type === 'add_to_wishlist') return 'Saved'
  if (action.type.startsWith('remove')) return 'Removed'
  return 'Added'
}

function MarkdownLink({ children }) {
  return <span>{children}</span>
}

function MarkdownImage({ src, alt }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) return null
  return <img src={src} alt={alt || ''} onError={() => setFailed(true)} />
}

function visibleReply(text, hasProduct) {
  if (!text) return ''
  if (!hasProduct) return text
  const withoutImages = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  const plain = withoutImages.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim()
  if (!plain) return ''
  if (plain.length < 180 && /·/.test(plain) && /\$\d/.test(plain)) return ''
  return withoutImages.trim()
}

function ProductPreview({ productId }) {
  const [product, setProduct] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getProduct(productId, { signal: controller.signal })
      .then(setProduct)
      .catch(() => {})
    return () => controller.abort()
  }, [productId])

  if (!product) return null
  const image = product.images?.[0]?.url
  return (
    <article className="assistant__product">
      {image ? <img src={image} alt="" /> : null}
      <div className="assistant__product-copy">
        <strong>{product.name}</strong>
        <span>
          {formatPrice(product.price)}
          {product.category?.name ? ` · ${product.category.name}` : ''}
        </span>
      </div>
    </article>
  )
}

function AssistantMarkdown({ text }) {
  return (
    <div className="assistant__bubble assistant__markdown">
      <Markdown
        remarkPlugins={[remarkBreaks]}
        components={{ a: MarkdownLink, img: MarkdownImage }}
      >
        {prepareAssistantMarkdown(text)}
      </Markdown>
    </div>
  )
}

const WELCOME =
  'Tell me what you are looking for, ask about an order, or say if you want something on your wishlist or in your cart.'

export default function Assistant() {
  const navigate = useNavigate()
  const { reloadCart } = useCart()
  const { reload: reloadWishlist } = useWishlist()
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
  const busyActions = useRef(new Set())

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

  function patchAction(messageIndex, actionIndex, patch) {
    setThread((items) =>
      items.map((entry, index) => {
        if (index !== messageIndex || !entry.actions) return entry
        return {
          ...entry,
          actions: entry.actions.map((action, cursor) =>
            cursor === actionIndex ? { ...action, ...patch } : action,
          ),
        }
      }),
    )
  }

  async function runAction(messageIndex, actionIndex) {
    const action = thread[messageIndex]?.actions?.[actionIndex]
    const key = `${messageIndex}:${actionIndex}`
    if (!action || action.status === 'pending' || action.status === 'done') return
    if (busyActions.current.has(key)) return
    if (action.type === 'navigate') {
      navigate(PAGES[action.page])
      return
    }
    if (action.type === 'view_product') {
      navigate(`/products/${action.slug}`)
      return
    }

    busyActions.current.add(key)
    patchAction(messageIndex, actionIndex, { status: 'pending', error: '' })
    try {
      if (action.type === 'add_to_wishlist') await addToWishlist(action.productId)
      else if (action.type === 'remove_from_wishlist') await removeFromWishlist(action.productId)
      else if (action.type === 'add_to_cart') await addCartItem(action.productId, action.quantity || 1)
      else await removeCartItem(action.productId)

      const refresh = action.type.includes('wishlist') ? reloadWishlist() : reloadCart()
      try {
        await refresh
      } catch {
        // The write succeeded. A stale badge catches up on the next load.
      }
      patchAction(messageIndex, actionIndex, { status: 'done', error: '' })
    } catch (err) {
      patchAction(messageIndex, actionIndex, {
        status: 'error',
        error: err?.message || 'Could not update that item.',
      })
    } finally {
      busyActions.current.delete(key)
    }
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
      const actions = asActions(data?.actions)
      if (!reply && actions.length === 0) {
        setError('No reply from the assistant. Try again.')
        return
      }
      const text = reply || 'Tap a button to continue.'
      setThread((items) => [...items, { role: 'assistant', text, actions }])
      const destination = [...actions].reverse().find((action) => action.type === 'navigate')
      if (destination) navigate(PAGES[destination.page])
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
                <div className="assistant__body">
                  {visibleReply(entry.text, entry.actions?.some((action) => action.productId)) ? (
                    <AssistantMarkdown
                      text={visibleReply(entry.text, entry.actions?.some((action) => action.productId))}
                    />
                  ) : null}
                  {entry.actions?.length ? (
                    <div className="assistant__actions">
                      {actionGroups(entry.actions).map((group) => {
                        const productId = group.find((item) => item.action.productId)?.action.productId
                        return (
                        <div
                          key={group.map((item) => item.actionIndex).join('-')}
                          className="assistant__action-row"
                        >
                          {productId ? <ProductPreview productId={productId} /> : null}
                          {group.map(({ action, actionIndex }) => {
                            const icon = actionIcon(action.type)
                            const lasting = action.type === 'navigate' || action.type === 'view_product'
                            return (
                              <button
                                key={`${action.type}-${action.productId ?? action.slug ?? action.page}-${actionIndex}`}
                                type="button"
                                className={`${actionTone(action.type)}${action.status === 'done' ? ' is-done' : ''}`}
                                disabled={!lasting && (action.status === 'pending' || action.status === 'done')}
                                onClick={() => runAction(index, actionIndex)}
                              >
                                {icon ? <Icon name={icon} /> : null}
                                {actionLabel(action)}
                              </button>
                            )
                          })}
                        </div>
                        )
                      })}
                      {entry.actions.some((action) => action.error) ? (
                        <p className="assistant__action-error" role="alert">
                          {entry.actions.find((action) => action.error).error}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
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