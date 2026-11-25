import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/context/AuthContext'
import FormField from '../components/FormField'
import Button from '../components/Button'
import { setAvatarPreview, useAvatarPreview } from '../features/account/avatarPreview'
import './AccountPage.css'

function applyUserToForm(user, setters) {
  if (!user) return
  setters.setName(user.name ?? '')
  setters.setPhone(user.phone ?? '')
  setters.setStreet(user.street ?? '')
  setters.setCity(user.city ?? '')
  setters.setApartment(user.apartment_number ?? '')
  setters.setFloor(user.floor ?? '')
  setters.setPhotoSrc(user.photo ?? '')
  if (user.photo) setAvatarPreview(user.photo)
}

function FormNotice({ error, success }) {
  if (!error && !success) return null
  return (
    <p className={`account__notice${error ? ' account__notice--error' : ' account__notice--success'}`} role="status">
      {error || success}
    </p>
  )
}

export default function AccountPage() {
  const { user, refreshUser, updateProfile, uploadProfilePhoto } = useAuth()
  const avatarPreview = useAvatarPreview()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [apartment, setApartment] = useState('')
  const [floor, setFloor] = useState('')
  const [photoSrc, setPhotoSrc] = useState('')
  const [photoFile, setPhotoFile] = useState(null)

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(null)

  const [addressSaving, setAddressSaving] = useState(false)
  const [addressError, setAddressError] = useState(null)
  const [addressSuccess, setAddressSuccess] = useState(null)

  const [photoSaving, setPhotoSaving] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [photoSuccess, setPhotoSuccess] = useState(null)

  const setters = {
    setName,
    setPhone,
    setStreet,
    setCity,
    setApartment,
    setFloor,
    setPhotoSrc,
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    refreshUser()
      .then((profile) => {
        if (!cancelled) applyUserToForm(profile, setters)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load your profile.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshUser])

  const displayPhoto = avatarPreview || photoSrc || null

  const onPhotoFile = useCallback((event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(String(reader.result))
    }
    reader.readAsDataURL(file)
  }, [])

  async function saveProfile(event) {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      const updated = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
      })
      applyUserToForm(updated, setters)
      setProfileSuccess('Profile saved.')
    } catch (err) {
      setProfileError(err.message || 'Could not save profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function saveAddress(event) {
    event.preventDefault()
    setAddressSaving(true)
    setAddressError(null)
    setAddressSuccess(null)
    try {
      const updated = await updateProfile({
        street: street.trim() || null,
        city: city.trim() || null,
        apartment_number: apartment.trim() || null,
        floor: floor.trim() || null,
      })
      applyUserToForm(updated, setters)
      setAddressSuccess('Address saved.')
    } catch (err) {
      setAddressError(err.message || 'Could not save address.')
    } finally {
      setAddressSaving(false)
    }
  }

  async function savePhoto(event) {
    event.preventDefault()
    setPhotoSaving(true)
    setPhotoError(null)
    setPhotoSuccess(null)
    if (!photoFile) {
      setPhotoError('Choose a photo first.')
      setPhotoSaving(false)
      return
    }
    try {
      const updated = await uploadProfilePhoto(photoFile)
      applyUserToForm(updated, setters)
      setPhotoFile(null)
      if (updated.photo) setAvatarPreview(updated.photo)
      setPhotoSuccess('Photo saved.')
    } catch (err) {
      setPhotoError(err.message || 'Could not save photo.')
    } finally {
      setPhotoSaving(false)
    }
  }

  if (loading) {
    return (
      <article className="desk account">
        <h1>{user?.name ?? 'Your account'}</h1>
        <p className="desk__lead">Loading your profile…</p>
      </article>
    )
  }

  if (loadError) {
    return (
      <article className="desk account">
        <h1>{user?.name ?? 'Your account'}</h1>
        <p className="account__notice account__notice--error" role="alert">
          {loadError}
        </p>
      </article>
    )
  }

  return (
    <article className="desk account">
      <h1>{user?.name ?? 'Your account'}</h1>
      <p className="desk__lead">Update the name, address, and photo used for orders.</p>

      <div className="account__grid">
        <section className="account__card account__photo-card">
          <h2>Photo</h2>
          <form className="account__form" onSubmit={savePhoto}>
            <div className="account__photo">
              {displayPhoto ? <img src={displayPhoto} alt="" /> : <span>No photo</span>}
            </div>
            <label className="account__file">
              Choose a photo
              <input id="account-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPhotoFile} />
            </label>
            <p className="account__hint">JPEG, PNG, WebP, or GIF up to 5 MB. Saved to storage and linked to your account.</p>
            <FormNotice error={photoError} success={photoSuccess} />
            <Button type="submit" disabled={photoSaving || !photoFile}>
              {photoSaving ? 'Saving…' : 'Save photo'}
            </Button>
          </form>
        </section>

        <section className="account__card">
          <h2>Profile</h2>
          <form className="account__form" onSubmit={saveProfile}>
            <div className="account__fields">
              <FormField id="account-name" label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
              <div className="account__email">
                <div className="account__email-label">
                  <span className="form-field__label" id="account-email-label">
                    Email
                  </span>
                  <span className="account__email-note">Can’t be changed</span>
                </div>
                <input
                  id="account-email"
                  className="account__email-value"
                  value={user?.email || 'No email on this account'}
                  readOnly
                  aria-readonly="true"
                  aria-labelledby="account-email-label"
                />
              </div>
              <FormField id="account-phone" label="Phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <FormNotice error={profileError} success={profileSuccess} />
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </section>

        <section className="account__card account__address">
          <h2>Address</h2>
          <form className="account__form" onSubmit={saveAddress}>
            <div className="account__fields">
              <FormField id="address-street" label="Street" autoComplete="street-address" value={street} onChange={(event) => setStreet(event.target.value)} />
              <FormField id="address-city" label="City" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} />
              <FormField
                id="address-apartment"
                label="Apartment number"
                autoComplete="address-line2"
                value={apartment}
                onChange={(event) => setApartment(event.target.value)}
              />
              <FormField id="address-floor" label="Floor" value={floor} onChange={(event) => setFloor(event.target.value)} />
            </div>
            <FormNotice error={addressError} success={addressSuccess} />
            <Button type="submit" disabled={addressSaving}>
              {addressSaving ? 'Saving…' : 'Save address'}
            </Button>
          </form>
        </section>
      </div>
    </article>
  )
}