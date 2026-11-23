import { useState } from 'react'
import './OrdersPage.css'

const STEPS = ['Placed', 'Packing', 'Shipped', 'Out for delivery', 'Delivered']

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

const INITIAL_ORDERS = [
  {
    id: '1042',
    status: 'Out for delivery',
    address: '12 Market Street, Cairo',
    items: [
      { name: 'Cedar tea tin', quantity: 1 },
      { name: 'Linen napkin set', quantity: 2 },
      { name: 'Olive oil, 500ml', quantity: 1 },
    ],
  },
  {
    id: '1038',
    status: 'Delivered',
    address: '8 Nile Road, Cairo',
    items: [
      { name: 'Stoneware bowl', quantity: 1 },
      { name: 'Wildflower honey', quantity: 1 },
    ],
  },
  {
    id: '1044',
    status: 'Packing',
    address: '4 Garden Lane, Cairo',
    items: [
      { name: 'Cotton hand towel', quantity: 2 },
      { name: 'Olive soap trio', quantity: 1 },
    ],
  },
]

function showsMap(status) {
  return status === 'Out for delivery' || status === 'Delivered'
}

function pillClass(status) {
  if (status === 'Out for delivery') return 'orders__pill orders__pill--travel'
  if (status === 'Delivered') return 'orders__pill orders__pill--done'
  return 'orders__pill'
}

function OrderMap({ status }) {
  const delivered = status === 'Delivered'

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
            <path className="orders-map__pin-body" d="M0 1.5c-3.2-7.2-13-11-13-23.2a13 13 0 0 1 26 0c0 12.2-9.8 16-13 23.2z" />
            <circle className="orders-map__pin-core" cy="-23.2" r="5" />
          </g>
        </svg>
        <div className="orders-map__home">
          {delivered && <span className="orders-map__arrived">Delivered here</span>}
          <span className="orders-map__home-name">Home</span>
        </div>
        <span
          className={delivered ? 'orders-map__courier orders-map__courier--done' : 'orders-map__courier orders-map__courier--live'}
        >
          {!delivered && <span className="orders-map__tag">Live</span>}
        </span>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [orders] = useState(INITIAL_ORDERS)
  const [selectedId, setSelectedId] = useState('1042')
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0]
  const currentIndex = STEPS.indexOf(selected.status)

  return (
    <article className="desk">
      <h1>Orders</h1>
      <p className="desk__lead">Sample orders, not from the server.</p>

      <div className="orders">
        <ul className="orders__list">
          {orders.map((order) => {
            const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
            return (
              <li key={order.id}>
                <button
                  type="button"
                  className="orders__pick"
                  aria-pressed={order.id === selected.id}
                  aria-controls="order-detail"
                  onClick={() => setSelectedId(order.id)}
                >
                  <span className="orders__id">#{order.id}</span>
                  <span className={pillClass(order.status)}>{order.status}</span>
                  <span className="orders__meta">
                    {order.address}
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
          <header className="orders__head">
            <div>
              <h2>Order #{selected.id}</h2>
              <p className="orders__address">{selected.address}</p>
            </div>
            <span className={pillClass(selected.status)}>{selected.status}</span>
          </header>

          <h3>Items</h3>
          <ul className="orders__items">
            {selected.items.map((item) => (
              <li key={item.name}>
                <span>{item.name}</span>
                <span className="orders__qty">× {item.quantity}</span>
              </li>
            ))}
          </ul>

          <h3>Status</h3>
          <ol className="orders-track">
            {STEPS.map((step, index) => {
              const isCurrent = index === currentIndex
              const isDone = index < currentIndex || (isCurrent && selected.status === 'Delivered')
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

          {showsMap(selected.status) ? (
            <OrderMap key={selected.id} status={selected.status} />
          ) : (
            <p className="orders__map-note">The map appears once the order is out for delivery.</p>
          )}
        </section>
      </div>
    </article>
  )
}
