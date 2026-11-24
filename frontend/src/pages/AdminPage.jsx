import { Link } from 'react-router-dom'
import { isLowStock, useCatalog } from '../features/admin/catalogStore'
import DeskAnnouncementsSection from '../features/admin/DeskAnnouncementsSection'
import DeskCouponsSection from '../features/admin/DeskCouponsSection'
import { useAuth } from '../features/auth/context/AuthContext'
import { notImplemented } from '../lib/notImplemented'
import './AdminPage.css'

const STATS = [
  { label: 'Orders today', value: '12' },
  { label: 'Revenue', value: '$842' },
  { label: 'Products', value: '48' },
]

const ORDERS = [
  { id: '1042', name: 'Maya Chen', total: '$64.00', status: 'Paid' },
  { id: '1041', name: 'Omar Ali', total: '$22.30', status: 'Packing' },
  { id: '1040', name: 'Lina Park', total: '$109.95', status: 'Shipped' },
  { id: '1039', name: 'Noah Kim', total: '$48.00', status: 'Paid' },
]

function statusClass(status) {
  return `admin__status admin__status--${status.toLowerCase()}`
}

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth()
  const isAdmin = true || (isAuthenticated && user?.role === 'admin')
  const low = useCatalog().filter(isLowStock)

  if (!isAdmin) {
    return (
      <article className="desk">
        <h1>Shop desk</h1>
        <p className="desk__lead">This desk is for shop staff.</p>
      </article>
    )
  }

  return (
    <article className="desk admin">
      <div className="admin__top">
        <div>
          <h1>Shop desk</h1>
          <p className="desk__lead">Sample figures until the desk is connected.</p>
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

      <ul className="admin__stats">
        {[...STATS, { label: 'To restock', value: String(low.length) }].map((stat) => (
          <li key={stat.label}>
            <p className="admin__value">{stat.value}</p>
            <p className="admin__label">{stat.label}</p>
          </li>
        ))}
      </ul>

      <div className="admin__split">
        <section className="admin__card">
          <h2>Recent orders</h2>
          <ul className="admin__orders">
            {ORDERS.map((order) => (
              <li key={order.id}>
                <button type="button" onClick={() => notImplemented('Opening an order')}>
                  <span>
                    <strong>#{order.id}</strong>
                    <span className="admin__who">{order.name}</span>
                  </span>
                  <span className="admin__total">{order.total}</span>
                  <span className={statusClass(order.status)}>{order.status}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin__card">
          <h2>To restock</h2>
          {low.length === 0 ? (
            <p className="admin__empty">Nothing is at its alert level.</p>
          ) : (
            <ul className="admin__stock">
              {low.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.stock} left · alert at {item.alertAt}
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
