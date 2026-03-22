const social = [
  { label: 'Instagram', href: 'https://instagram.com/' },
  { label: 'Facebook', href: 'https://facebook.com/' },
  { label: 'YouTube', href: 'https://youtube.com/' },
  { label: 'TikTok', href: 'https://tiktok.com/' },
]

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-copy">
          SR Styling — premium vehicle styling and performance aesthetics.{' '}
          <strong>Service area:</strong> Dublin and surrounding counties
          (Wicklow, Kildare, Meath, Louth).
        </p>
        <div className="footer-social" role="list">
          {social.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              role="listitem"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
