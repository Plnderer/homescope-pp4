import { useEffect, useState, useRef } from "react";
import { getSummary } from "../services/api";
import { Reveal } from "../hooks/useScrollReveal";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function pick(data, keys, fallback = 0) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null) return data[key];
  }
  return fallback;
}

function countValue(value) {
  if (Array.isArray(value)) return value.length;
  return Number(value) || 0;
}

const howItWorks = [
  ["01", "Enter the listing details", "Start with the visible facts from the listing: location, beds, baths, living space, and asking price."],
  ["02", "Compare similar records", "HomeScope checks the listing against similar housing records and market context."],
  ["03", "Review the fair value range", "Read the estimate, range, price signal, and the note about what the result can and cannot prove."],
  ["04", "Check evidence if needed", "Use Market for area prices and How It Works only when you want more detail."],
];

export default function OverviewPage({ setActivePage }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const heroRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate tilt angles
    const xPct = (x / rect.width - 0.5) * 2;
    const yPct = (y / rect.height - 0.5) * 2;

    setTilt({ x: -yPct * 15, y: xPct * 15 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch(() => setError("Live summary is unavailable. The app still works once the FastAPI backend is running."));
  }, []);

  const totalRecords = pick(summary, ["record_count", "total_records", "count"]);
  const medianPrice = pick(summary, ["median_price"]);
  const states = countValue(pick(summary, ["states_count", "state_count", "states"]));
  const cities = countValue(pick(summary, ["cities_count", "city_count", "cities"]));

  return (
    <div className="landing-page">
      <section
        className="mindblowing-hero"
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >


        <Reveal className="hero-content text-center">
          <span className="eyebrow" style={{justifyContent: 'center'}}>Home Value Intelligence</span>
          <h1 className="hero-massive-title">See what a home is worth.</h1>
          <p className="hero-sub">
            Enter a few listing details and HomeScope will give you a plain-English read on whether the asking price looks fair.
          </p>
          <div className="hero-actions center-actions">
            <button type="button" className="hero-pill-button" onClick={() => setActivePage("predict")}>
              Check Home Price
            </button>
          </div>
        </Reveal>

        <div className="isometric-container">
          <div className="spotlight-overlay"></div>
          <div
            className="isometric-mockup"
            style={{
              transform: `rotateX(${60 + tilt.x}deg) rotateZ(${-45 + tilt.y}deg) translateZ(0)`
            }}
          >
            <div className="mockup-glass">
              <div className="mockup-header">
                <div className="mockup-address">123 Example Street</div>
                <div className="mockup-price">{medianPrice ? currency.format(medianPrice) : "$545,000"}</div>
              </div>
              <div className="mockup-body">
                <div className="mockup-row"><div className="mockup-label">Estimated Value</div><div className="mockup-value">$542,500</div></div>
                <div className="mockup-row"><div className="mockup-label">Confidence</div><div className="mockup-value">High (92%)</div></div>
                <div className="mockup-chart">
                  <div className="mockup-bar" style={{ width: "40%" }}></div>
                  <div className="mockup-bar" style={{ width: "70%" }}></div>
                  <div className="mockup-bar" style={{ width: "55%" }}></div>
                </div>
              </div>
            </div>
            {/* Layers for 3D depth */}
            <div className="mockup-layer layer-1"></div>
            <div className="mockup-layer layer-2"></div>
            <div className="mockup-shadow"></div>
          </div>
        </div>
        <div className="hero-bottom-fade"></div>
      </section>

      {error ? <div className="notice-panel">{error}</div> : null}

      <Reveal as="section" className="quick-guide-showcase glass-panel">
        <div className="showcase-content">
          <span className="eyebrow">Quick guide</span>
          <h2>How to use HomeScope</h2>

          <div className="showcase-tabs">
            {[
              { title: "Check Price", desc: "Start here if you already have a listing price to evaluate." },
              { title: "Area Prices", desc: "Use this only if you want extra context on similar homes." },
              { title: "How It Works", desc: "Optional plain-English explanation of how the price check was made." }
            ].map((step, i) => (
              <div
                key={i}
                className={`showcase-tab ${activeStep === i ? "active" : ""}`}
                onClick={() => { setActiveStep(i); setIsPaused(true); }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="tab-progress">
                  <div
                    className="tab-progress-fill"
                    style={{
                      animationDuration: "5s",
                      animationPlayState: isPaused ? "paused" : "running",
                      animationName: activeStep === i ? "fillProgress" : "none"
                    }}
                  ></div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="showcase-visual">
          <div className="glow-orb showcase-orb"></div>
          <div className={`visual-pane pane-active-${activeStep}`}>
            {activeStep === 0 && (
              <div className="abstract-graphic abstract-report">
                <div className="doc-mockup">
                  <div className="doc-line w-full"></div>
                  <div className="doc-line w-3/4"></div>
                  <div className="doc-box"></div>
                </div>
                <div className="pulse-ring"></div>
              </div>
            )}
            {activeStep === 1 && (
              <div className="abstract-graphic abstract-market">
                <div className="bar-chart">
                  <div className="bar h-1"></div>
                  <div className="bar h-3"></div>
                  <div className="bar h-2 active-bar"></div>
                  <div className="bar h-4"></div>
                  <div className="bar h-2"></div>
                </div>
              </div>
            )}
            {activeStep === 2 && (
              <div className="abstract-graphic abstract-model">
                <div className="nodes-mesh">
                  <div className="node n1"></div>
                  <div className="node n2"></div>
                  <div className="node n3"></div>
                  <div className="node n4"></div>
                  <svg className="edges">
                    <line x1="20%" y1="20%" x2="80%" y2="50%" stroke="var(--gold-soft)" strokeWidth="2" opacity="0.4" />
                    <line x1="20%" y1="80%" x2="80%" y2="50%" stroke="var(--gold-soft)" strokeWidth="2" opacity="0.4" />
                    <line x1="20%" y1="20%" x2="20%" y2="80%" stroke="var(--gold-soft)" strokeWidth="2" opacity="0.2" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>

      <section className="story-section horizontal-minimalist-section">
        <div className="hm-layout">
          <div className="hm-left">
            <Reveal className="hm-sticky-heading">
              <span className="eyebrow">How HomeScope works</span>
              <h2>A clear path from listing price to research estimate.</h2>
              <p className="hm-subtext">We've broken down the complex valuation process into four transparent, easy-to-understand steps.</p>
            </Reveal>
          </div>

          <div className="hm-right">
            <div className="hm-panels-grid">
              {howItWorks.map(([number, title, copy], index) => {
                return (
                  <Reveal as="article" className="hm-panel" delay={index ? "1" : undefined} key={title}>
                    <div className="hm-panel-header">
                      <span className="hm-number">{number}</span>
                    </div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="story-section flow-section">
        <Reveal className="section-heading">
          <span className="eyebrow">Recommended flow</span>
          <h2>Start with the price check. Use the evidence when it helps.</h2>
        </Reveal>
        <div className="bento-grid bento-flow clean-bento premium-bento">
          <Reveal as="article" className="bento-card clean-card span-2-col span-2-row step-1-card has-glow">
            <div className="ambient-glow"></div>
            <div className="noise-overlay"></div>
            <span className="clean-badge">STEP 1</span>
            <div className="card-center-title">
              <h3>Check this home price</h3>
            </div>
            <div className="card-bottom-content">
              <p>Enter a listing and see whether the asking price looks low, fair, or high.</p>
              <button type="button" className="text-button dash-button gold-text" onClick={() => setActivePage("predict")}>
                <span className="btn-text">Check Home Price</span>
                <span className="btn-arrow">&mdash;</span>
              </button>
            </div>
          </Reveal>
          <Reveal as="article" className="bento-card clean-card span-2-col" delay="1">
            <div className="noise-overlay"></div>
            <div className="card-top-row">
              <span className="clean-badge">STEP 2</span>
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="14" width="4" height="7" rx="1"/>
                  <rect x="10" y="8" width="4" height="13" rx="1"/>
                  <rect x="17" y="3" width="4" height="18" rx="1"/>
                </svg>
              </div>
            </div>
            <h3>See area prices</h3>
            <p>Use Market to see similar homes, price ranges, and broad U.S. price movement.</p>
            <div className="card-action">
              <button type="button" className="text-button dash-button gold-text" onClick={() => setActivePage("market")}>
                <span className="btn-text">See Area Prices</span>
                <span className="btn-arrow">&mdash;</span>
              </button>
            </div>
          </Reveal>
          <Reveal as="article" className="bento-card clean-card span-2-col" delay="2">
            <div className="noise-overlay"></div>
            <div className="card-top-row">
              <span className="clean-badge">STEP 3</span>
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
            </div>
            <h3>Optional: see how it works</h3>
            <p>Open the explanation only if you want to see how the price check was produced.</p>
            <div className="card-action">
              <button type="button" className="text-button dash-button gold-text" onClick={() => setActivePage("model")}>
                <span className="btn-text">How It Works</span>
                <span className="btn-arrow">&mdash;</span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal as="section" className="final-cta">
        <span className="eyebrow">Next step</span>
        <h2>Check the home price first.</h2>
        <p>Area prices and the method explanation are available after that if you want to dig deeper.</p>
        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={() => setActivePage("predict")}>Check Home Price</button>
          <button type="button" className="secondary-button" onClick={() => setActivePage("market")}>See Area Prices</button>
        </div>
      </Reveal>
    </div>
  );
}
