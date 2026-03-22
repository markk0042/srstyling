import { useState, type FormEvent } from 'react'
import { CONTACT_EMAIL } from '../contactEmail'

export function Contact() {
  const [sent, setSent] = useState(false)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '')
    const email = String(data.get('email') ?? '')
    const topic = String(data.get('topic') ?? '')
    const message = String(data.get('message') ?? '')

    const subject = encodeURIComponent(`SR Styling — ${topic || 'Enquiry'}`)
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    )
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    window.location.href = mailto
    setSent(true)
  }

  return (
    <section className="section" style={{ paddingTop: '3rem' }}>
      <div className="section-head">
        <p className="section-kicker">Contact</p>
        <h1 className="section-title">Tell us about your project</h1>
      </div>
      <p style={{ color: 'var(--muted)', maxWidth: '55ch', marginBottom: '2rem' }}>
        Questions about wraps, aero, wheels, or anything else — drop a note. The
        form opens your email app with a pre-filled message.
      </p>

      <div className="contact-grid">
        <form className="contact-form" onSubmit={onSubmit}>
          <label>
            Name
            <input name="name" required autoComplete="name" />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Topic
            <input
              name="topic"
              placeholder="e.g. Full wrap, front lip, wheels"
            />
          </label>
          <label>
            Message
            <textarea name="message" required placeholder="Vehicle, goals, timeline…" />
          </label>
          <button type="submit" className="btn btn-primary">
            Send via email
          </button>
        </form>
        <div>
          <div className="coverage-card" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Service area:</strong>{' '}
              Dublin and surrounding counties. We will respond with availability
              and next steps.
            </p>
          </div>
          {sent && (
            <p className="form-status" role="status">
              Your email app should open with a draft. If nothing happens,
              check that you have a default mail client configured.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
