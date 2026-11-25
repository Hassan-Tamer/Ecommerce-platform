import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import DeskAnnouncementsSection from '../features/admin/DeskAnnouncementsSection'
import DeskCouponsSection from '../features/admin/DeskCouponsSection'
import { formatPrice } from '../features/catalog/api/productsApi'
import * as adminOrdersApi from '../features/orders/api/adminOrdersApi'
import { adminDeskStatusLabel, adminStatusClass } from '../features/orders/orderUi'
import { useAuth } from '../features/auth/context/AuthContext'
import './AdminPage.css'

export default function AdminPage() {
  const { user, isAuthenticated, ready } = useAuth()
  const isAdmin = isAuthenticated && user?.role === 'admin'

  const [summary, setSummary] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!ready || !isAdmin) return undefined

    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)

    Promise.all([
      adminOrdersApi.getAdminSummary({ signal: controller.signal }),
      adminOrdersApi.listAdminOrders({ limit: 12, signal: controller.signal }),
    ])
      .then(([summaryData, ordersData]) => {
        setSummary(summaryData)
        setOrders(ordersData?.items ?? [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setSummary(null)
        setOrders([])
        setLoadError(err.message || 'Could not load desk data.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [ready, isAdmin])

  const stats = useMemo(() => {
    if (!summary) return null
    return [
      { label: 'Orders today', value: String(summary.orders_today) },
      { label: 'Revenue today', value: formatPrice(summary.revenue_today) },
      { label: 'Revenue this month', value: formatPrice(summary.revenue_this_month) },
      { label: 'Products', value: String(summary.product_count) },
      { label: 'To restock', value: String(summary.low_stock_count) },
    ]
  }, [summary])

  if (!ready) {
    return (
      <article className="desk">
        <h1>Shop desk</h1>
        <p className="desk__lead">Loading…</p>
      </article>
    )
  }

  if (!isAdmin) {
    return (
      <article className="desk">
        <h1>Shop desk</h1>
        <p className="desk__lead">This desk is for shop staff with an admin account.</p>
      </article>
    )
  }

  const lowStock = summary?.low_stock_items ?? []
  const alertAt = summary?.low_stock_threshold ?? 5

  return (
    <article className="desk admin">
      <div className="admin__top">
        <div>
          <h1>Shop desk</h1>
          <p className="desk__lead">
            {loading ? 'Refreshing numbers…' : 'Orders, revenue, and stock from the server.'}
          </p>
        </div>
        <div className="admin__links">
          <Link className="btn btn--primary" to="/admin/products">
            Manage products
          </Link>
          <Link className="btn btn--ghost" to="/admin/inventory">
            Inventory
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="desk__lead desk__lead--error" role="alert">
          {loadError}
        </p>
      ) : null}

      <ul className="admin__stats">
        {(stats ?? [
          { label: 'Orders today', value: '—' },
          { label: 'Revenue today', value: '—' },
          { label: 'Revenue this month', value: '—' },
          { label: 'Products', value: '—' },
          { label: 'To restock', value: '—' },
        ]).map((stat) => (
          <li key={stat.label}>
            <p className="admin__value">{stat.value}</p>
            <p className="admin__label">{stat.label}</p>
          </li>
        ))}
      </ul>

      <div className="admin__split">
        <section className="admin__card">
          <h2>Recent orders</h2>
          {orders.length === 0 && !loading ? (
            <p className="admin__empty">No orders yet.</p>
          ) : (
            <ul className="admin__orders">
              {orders.map((order) => (
                <li key={order.id}>
                  <button type="button" disabled aria-label={`Order ${order.id}`}>
                    <span>
                      <strong>#{order.id}</strong>
                      <span className="admin__who">{order.customer_name}</span>
                    </span>
                    <span className="admin__total">{formatPrice(order.total)}</span>
                    <span className={adminStatusClass(order.status)}>{adminDeskStatusLabel(order.status)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin__card">
          <h2>To restock</h2>
          {lowStock.length === 0 ? (
            <p className="admin__empty">Nothing is at its alert level.</p>
          ) : (
            <ul className="admin__stock">
              {lowStock.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.stock_quantity} left · alert at {alertAt}
                    </span>
                  </div>
                  <Link to="/admin/inventory">Stock</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin__card admin__announcements" id="coupons" aria-labelledby="coupons-heading">
        <h2 id="coupons-heading">Coupons</h2>
        <p className="admin__section-lead">
          Codes shoppers can apply at checkout. Percent coupons can cap the discount.
        </p>
        <DeskCouponsSection />
      </section>

      <section className="admin__card admin__announcements" id="announcements" aria-labelledby="announcements-heading">
        <h2 id="announcements-heading">Announcements</h2>
        <p className="admin__section-lead">
          Home-page notices. The shop shows three at a time and rotates through active rows.
        </p>
        <DeskAnnouncementsSection />
      </section>
    </article>
  )
}