import { useState } from 'react'
import { useAuth } from '../features/auth/context/AuthContext'
import FormField from '../components/FormField'
import Button from '../components/Button'
import { setAvatarPreview } from '../features/account/avatarPreview'
import { notImplemented } from '../lib/notImplemented'
import './AccountPage.css'

export default function AccountPage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postal, setPostal] = useState('')
  const [photo, setPhoto] = useState(null)

  function onPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const next = String(reader.result)
      setPhoto(next)
      setAvatarPreview(next)
    }
    reader.readAsDataURL(file)
  }

  return (
    <article className="desk account">
      <h1>{user?.name ?? 'Your account'}</h1>
      <p className="desk__lead">Update the name, address, and photo used for orders.</p>

      <div className="account__grid">
        <section className="account__card account__photo-card">
          <h2>Photo</h2>
          <form
            className="account__form"
            onSubmit={(event) => {
              event.preventDefault()
              notImplemented('Saving your photo')
            }}
          >
            <div className="account__photo">
              {photo ? <img src={photo} alt="" /> : <span>No photo</span>}
            </div>
            <label className="account__file">
              Choose a photo
              <input id="account-photo" type="file" accept="image/*" onChange={onPhoto} />
            </label>
            <Button type="submit">Save photo</Button>
          </form>
        </section>

        <section className="account__card">
          <h2>Profile</h2>
          <form
            className="account__form"
            onSubmit={(event) => {
              event.preventDefault()
              notImplemented('Saving your profile')
            }}
          >
            <div className="account__fields">
              <FormField id="account-name" label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
              <div className="account__email">
                <span className="form-field__label">Email</span>
                <p>{user?.email || '—'}</p>
              </div>
              <FormField id="account-phone" label="Phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </section>

        <section className="account__card account__address">
          <h2>Address</h2>
          <form
            className="account__form"
            onSubmit={(event) => {
              event.preventDefault()
              notImplemented('Saving your address')
            }}
          >
            <div className="account__fields">
              <FormField id="address-street" label="Street" autoComplete="street-address" value={street} onChange={(event) => setStreet(event.target.value)} />
              <FormField id="address-city" label="City" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} />
              <FormField id="address-region" label="Region" autoComplete="address-level1" value={region} onChange={(event) => setRegion(event.target.value)} />
              <FormField id="address-postal" label="Postal code" autoComplete="postal-code" value={postal} onChange={(event) => setPostal(event.target.value)} />
            </div>
            <Button type="submit">Save address</Button>
          </form>
        </section>
      </div>
    </article>
  )
}
