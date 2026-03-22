import { Link } from 'react-router-dom'

const portfolio = [
  {
    title: 'Full aero package',
    src: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80',
  },
  {
    title: 'Ceramic & wheels',
    src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  },
  {
    title: 'Track stance',
    src: 'https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80',
  },
  {
    title: 'Carbon accents',
    src: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
  },
]

export function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="m-stripes" aria-hidden>
            <span className="s1" />
            <span className="s2" />
            <span className="s3" />
          </div>
          <h1>Precision styling for drivers who care.</h1>
          <p className="hero-lead">
            SR Styling delivers premium wraps, aero, wheels, and detailing
            across Dublin and the surrounding region — with a digital configurator
            so you can explore options before you book.
          </p>
          <div className="hero-actions">
            <Link to="/configure" className="btn btn-primary">
              Configure a build
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Get a quote
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="coverage">
        <div className="section-head">
          <p className="section-kicker">Area</p>
          <h2 className="section-title">Where we work</h2>
        </div>
        <div className="coverage-card">
          <p>
            We are based in <strong>Dublin</strong> and regularly serve{' '}
            <strong>surrounding Dublin regions</strong> — including Wicklow,
            Kildare, Meath, and Louth. Not sure if you are in range? Send a
            message through our contact form and we will confirm.
          </p>
        </div>
      </section>

      <section className="section" id="work">
        <div className="section-head">
          <p className="section-kicker">Portfolio</p>
          <h2 className="section-title">Previous work</h2>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: '-1rem', marginBottom: '1.5rem', maxWidth: '55ch' }}>
          A selection of recent projects.
        </p>
        <div className="portfolio-grid">
          {portfolio.map((item) => (
            <article key={item.title} className="portfolio-item">
              <img src={item.src} alt="" loading="lazy" />
              <div className="portfolio-caption">{item.title}</div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
