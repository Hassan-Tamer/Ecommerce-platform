import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { formatPrice } from '../features/catalog/api/productsApi'
import * as ordersApi from '../features/orders/api/ordersApi'
import {
  ORDER_TRACK_STEPS,
  formatShippingAddress,
  orderPillClass,
  orderShowsMap,
  orderStatusLabel,
  orderStepIndex,
} from '../features/orders/orderUi'
import './OrdersPage.css'

const ROADS = [
  'M0 70H640',
  'M0 160H640',
  'M0 250H640',
  'M90 18V304',
  'M230 18V304',
  'M370 18V304',
  'M510 18V304',
]

const BLOCKS = [
  [244, 86, 110, 58],
  [384, 86, 110, 58],
  [524, 86, 96, 58],
  [104, 176, 110, 58],
  [244, 176, 110, 58],
  [384, 176, 110, 58],
  [524, 176, 96, 58],
]

const ROUTE = '90,250 230,250 230,160 370,160 370,70 510,70'

function OrderMap({ status }) {
  const delivered = status === 'delivered'

  return (
    <div className="orders-map">
      <div className="orders-map__stage">
        <svg className="orders-map__svg" viewBox="0 0 640 360" aria-hidden="true">
          <rect className="orders-map__ground" width="640" height="360" />
          <path
            className="orders-map__river"
            d="M0 300C80 278 140 328 220 306C310 282 370 330 460 308C540 290 590 322 640 304L640 360L0 360Z"
          />
          <path
            className="orders-map__park"
            d="M128 118C126 98 158 90 174 102C196 94 208 114 196 130C208 142 174 146 156 134C132 146 118 136 128 118Z"
          />
          <circle className="orders-map__tree" cx="150" cy="114" r="4" />
          <circle className="orders-map__tree" cx="172" cy="120" r="3.5" />
          <circle className="orders-map__tree" cx="158" cy="128" r="3" />
          {BLOCKS.map(([x, y, width, height]) => (
            <rect key={`${x}-${y}`} className="orders-map__block" x={x} y={y} width={width} height={height} rx="10" />
          ))}
          <g className="orders-map__roads">
            {ROADS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g className="orders-map__lanes">
            {ROADS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <polyline className="orders-map__route-bed" points={ROUTE} />
          <polyline className="orders-map__route" points={ROUTE} />
          <circle className="orders-map__depot" cx="90" cy="250" r="5" />
          <g className="orders-map__pin" transform="translate(510 70)">
            <path
              className="orders-map__pin-body"
              d="M0 1.5c-3.2-7.2-13-11-13-23.2a13 13 0 0 1 26 0c0 12.2-9.8 16-13 23.2z"
            />
            <circle className="orders-map__pin-core" cy="-23.2" r="5" />
          </g>
        </svg>
        <div className="orders-map__home">
          {delivered && <span className="orders-map__arrived">Delivered here</span>}
          <span className="orders-map__home-name">Home</span>
        </div>
        <span
          className={
            delivered ? 'orders-map__courier orders-map__courier--done' : 'orders-map__courier orders-map__courier--live'
          }
        >
          {!delivered && <span className="orders-map__tag">Live</span>}
        </span>
      </div>
    </div>
  )
}

function summaryAddress(summary, detailsById) {
  const detail = detailsById[summary.id]
  if (detail?.shipping_address) return formatShippingAddress(detail.shipping_address)
  return ''
}

export default function OrdersPage() {
  const location = useLocation()
  const [summaries, setSummaries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailsById, setDetailsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [detailError, setDetailError] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)

    ordersApi
      .listOrders({ signal: controller.signal })
      .then((data) => {
        const rows = data?.items ?? []
        setSummaries(rows)
        const highlight = location.state?.highlightOrderId
        const firstId = rows[0]?.id ?? null
        if (highlight && rows.some((row) => row.id === highlight)) {
          setSelectedId(highlight)
        } else if (firstId != null) {
          setSelectedId(firstId)
        } else {
          setSelectedId(null)
          setSelectedOrder(null)
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setSummaries([])
        setLoadError(err.message || 'Could not load orders.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [location.state?.highlightOrderId])

  useEffect(() => {
    if (selectedId == null) {
      setSelectedOrder(null)
      return undefined
    }

    const cached = detailsById[selectedId]
    if (cached) {
      setSelectedOrder(cached)
      setDetailLoading(false)
      setDetailError(null)
      return undefined
    }

    const controller = new AbortController()
    setDetailLoading(true)
    setDetailError(null)

    ordersApi
      .getOrder(selectedId, { signal: controller.signal })
      .then((order) => {
        setDetailsById((current) => ({ ...current, [order.id]: order }))
        setSelectedOrder(order)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setSelectedOrder(null)
        setDetailError(err.message || 'Could not load order details.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false)
      })

    return () => controller.abort()
    // detailsById intentionally omitted: cache is checked per selectedId only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cache read on selectedId change
  }, [selectedId])

  const selectedSummary = useMemo(
    () => summaries.find((row) => row.id === selectedId) ?? null,
    [summaries, selectedId],
  )

  const status = selectedOrder?.status ?? selectedSummary?.status ?? 'pending'
  const currentIndex = orderStepIndex(status)
  const cancelled = status === 'cancelled'

  let body
  if (loading) {
    body = <p className="desk__lead">Loading your orders…</p>
  } else if (loadError) {
    body = (
      <p className="desk__lead desk__lead--error" role="alert">
        {loadError}
      </p>
    )
  } else if (summaries.length === 0) {
    body = <p className="desk__lead">You have not placed any orders yet.</p>
  } else {
    body = (
      <div className="orders">
        <ul className="orders__list">
          {summaries.map((order) => {
            const count = order.item_count ?? 0
            const address = summaryAddress(order, detailsById)
            return (
              <li key={order.id}>
                <button
                  type="button"
                  className="orders__pick"
                  aria-pressed={order.id === selectedId}
                  aria-controls="order-detail"
                  onClick={() => setSelectedId(order.id)}
                >
                  <span className="orders__id">#{order.id}</span>
                  <span className={orderPillClass(order.status)}>{orderStatusLabel(order.status)}</span>
                  <span className="orders__meta">
                    {address || formatPrice(Number(order.total))}
                    <span className="orders__count">
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <section className="orders__detail" id="order-detail" aria-live="polite">
          {detailLoading && !selectedOrder ? <p className="orders__loading">Loading order…</p> : null}
          {detailError ? (
            <p className="orders__error" role="alert">
              {detailError}
            </p>
          ) : null}
          {selectedOrder ? (
            <>
              <header className="orders__head">
                <div>
                  <h2>Order #{selectedOrder.id}</h2>
                  <p className="orders__address">{formatShippingAddress(selectedOrder.shipping_address)}</p>
                </div>
                <span className={orderPillClass(selectedOrder.status)}>{orderStatusLabel(selectedOrder.status)}</span>
              </header>

              <h3>Items</h3>
              <ul className="orders__items">
                {selectedOrder.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.product_name}
                      <span className="orders__line-price">{formatPrice(Number(item.line_total))}</span>
                    </span>
                    <span className="orders__qty">× {item.quantity}</span>
                  </li>
                ))}
              </ul>

              <p className="orders__grand-total">
                <span>Total</span>
                <strong>{formatPrice(Number(selectedOrder.total))}</strong>
              </p>

              <h3>Status</h3>
              {cancelled ? (
                <p className="orders__cancelled">This order was cancelled.</p>
              ) : (
                <ol className="orders-track">
                  {ORDER_TRACK_STEPS.map((step, index) => {
                    const isCurrent = index === currentIndex
                    const isDone = index < currentIndex || (isCurrent && status === 'delivered')
                    const className = [
                      'orders-track__step',
                      isDone ? 'orders-track__step--done' : '',
                      isCurrent ? 'orders-track__step--current' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <li key={step} className={className} aria-current={isCurrent ? 'step' : undefined}>
                        <span className="orders-track__mark" aria-hidden="true" />
                        <span className="orders-track__name">{step}</span>
                      </li>
                    )
                  })}
                </ol>
              )}

              {orderShowsMap(status) ? (
                <OrderMap key={selectedOrder.id} status={status} />
              ) : (
                <p className="orders__map-note">The map appears once the order is out for delivery.</p>
              )}
            </>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <article className="desk">
      <h1>Orders</h1>
      <p className="desk__lead">Orders you have placed in this shop.</p>
      {body}
    </article>
  )
}