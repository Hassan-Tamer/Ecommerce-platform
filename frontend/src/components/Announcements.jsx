import './Announcements.css'

const NOTICES = [
  {
    id: 'shipping',
    title: 'Ships in two days',
    body: 'In-stock orders leave the warehouse within two business days, and tracking arrives by email.',
  },
  {
    id: 'sale',
    title: 'Weekend sale',
    body: 'Marked housewares are fifteen percent off from Friday morning through Sunday night.',
  },
  {
    id: 'arrival',
    title: 'New cedar tray',
    body: 'A hand-finished cedar tray is now in the catalog in small and large.',
  },
]

export default function Announcements() {
  return (
    <section className="announcements" aria-label="Announcements">
      <ul className="announcements__list">
        {NOTICES.map((notice) => (
          <li key={notice.id} className="announcements__card">
            <h2 className="announcements__title">{notice.title}</h2>
            <p className="announcements__body">{notice.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
