import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  heading: string;
  items: FaqItem[];
}

// Grouped roughly the way a first-time visitor's questions actually
// escalate: what is this → how do I use it → is it safe → what if
// something's wrong. Kept in plain language on purpose — this is the page
// someone lands on BEFORE they trust the product enough to dig into
// anything more technical.
const SECTIONS: FaqSection[] = [
  {
    heading: 'Getting Started',
    items: [
      {
        q: 'What is Malvin AI?',
        a: "Malvin AI is a scan-and-connect platform for local businesses. Point your phone at a VINQR code — on a storefront, a menu, a business card — or open a shared Malvin link, and you land straight on that business's page: what they offer, live availability, and a way to order, book, or request service, all inside one app instead of a different one per business.",
      },
      {
        q: "Do I need to download an app to use it?",
        a: "No. Scanning a Malvin link opens straight in your browser first — you can see the business's details immediately, no install required. If you want the full app experience (faster access, notifications), Android has a one-tap install; iPhone users can add Malvin to their Home Screen from Safari (Share ▸ Add to Home Screen) and use it just like an installed app, including notifications — no App Store needed.",
      },
      {
        q: 'What kinds of businesses are on Malvin?',
        a: 'Five categories today: Food (restaurants), Salon, Hotel, Mechanic, and Service (general trades — plumbing, electrical, cleaning, and similar). Each has its own storefront experience built around how that kind of business actually operates — a restaurant menu looks and works differently from a mechanic\'s repair intake, for instance.',
      },
      {
        q: 'Can one business run more than one type of storefront?',
        a: "Yes — a single owner can run a Food account and a Salon account side by side, each with its own link, its own page, its own ratings, and its own listing in your Recent Businesses. They're treated as completely separate businesses even if the same person or team is behind both.",
      },
    ],
  },
  {
    heading: 'Ordering, Booking & Service Requests',
    items: [
      {
        q: 'How do I order food, book an appointment, or request a service?',
        a: "It depends on the category, but the shape is the same everywhere: browse what's offered, pick what you want (or describe the problem, for Mechanic/Service), and send it through. Restaurants and salons let you order or book directly off a live menu or schedule. Mechanic and Service work more like a quote request — you describe the issue, the business reviews it and sends back a price, and you accept or negotiate from there.",
      },
      {
        q: 'What does the urgency picker do on a service request?',
        a: 'When you submit a Service request, you flag how urgent it is — Emergency (ASAP), Today, This week, or Schedule for later. Emergency requests are surfaced first on the business\'s side, ahead of everything else, so a burst pipe gets seen before a routine job that happened to be submitted earlier.',
      },
      {
        q: "Can I negotiate a quote?",
        a: "If the business allows it, yes — once they've sent a quote you can counter with your own offer instead of accepting outright. They can accept or decline your counter, and you'll be notified either way.",
      },
      {
        q: 'Can I cancel a request after I\'ve gotten a quote?',
        a: "Yes, any time before you've paid. Cancelling notifies the business immediately so they're not left waiting on a job that isn't happening.",
      },
    ],
  },
  {
    heading: 'Payments & Security',
    items: [
      {
        q: 'Is it safe to pay through Malvin?',
        a: "Payments are processed through Stripe, a widely used payment processor — Malvin never stores your full card details. You can also keep a Malvin wallet balance for instant in-app payments to any business.",
      },
      {
        q: '"This merchant isn\'t ready to receive payment" — what does that mean?',
        a: "It means that specific business hasn't finished setting up their payment account yet, not that anything is wrong on your end. You'll see this before any charge is attempted — no payment goes through, and you can try again once they've finished setup, or reach out to them directly.",
      },
      {
        q: 'Why did I see an "Unsecure route detected" message?',
        a: "That appears specifically when you scan a Malvin QR code with your phone's regular camera app rather than opening it in Malvin — it's Malvin handing you off from the open web into the secure, logged-in app experience, not a warning that something's actually wrong.",
      },
      {
        q: 'Should I only use official Malvin links and QR codes?',
        a: "Yes. Malvin-generated VINQR codes and links are the ones we can vouch for. Treat a Malvin link the same way you'd treat any payment link — if a code or link didn't come from a source you trust, don't scan it.",
      },
    ],
  },
  {
    heading: 'Notifications, Sharing & Your Account',
    items: [
      {
        q: 'How do notifications work?',
        a: "Inside the native app, you get real push notifications the moment something needs your attention. If you're using Malvin via iPhone's Add to Home Screen option, you'll also get real push notifications, the same as a native app, powered by your browser rather than the App Store.",
      },
      {
        q: 'What is VinMoment?',
        a: "VinMoment is how you share a business you like — a shareable card that opens straight into that business's Malvin page for whoever you send it to, so recommending a place is as easy as sending a link, no explaining required.",
      },
      {
        q: 'Do ratings carry over between categories?',
        a: "No — each business, even if it's run by the same person under the same account, has its own independent star rating. A Mechanic business and a Service business under the same owner are rated completely separately, so one bad repair job never unfairly drags down an unrelated cleaning business.",
      },
      {
        q: "I run a business — how is Malvin different from just having my own website?",
        a: "Malvin puts you directly in front of people already looking for what you offer, right where they are — scanning a code, opening a shared link — rather than you having to drive traffic to a separate site. You get one dashboard for orders/bookings/requests, direct customer communication, team management, and payments, without stitching together separate tools for each.",
      },
    ],
  },
];

const FAQ = () => {
  // One open item at a time within each section, tracked as "sectionIndex-itemIndex" keys.
  const [openKey, setOpenKey] = useState<string | null>('0-0');

  return (
    <>
      <Helmet>
        <title>FAQ | Malvin AI</title>
        <meta
          name="description"
          content="Answers to common questions about how Malvin AI works — scanning, ordering, booking, service requests, payments, and account safety."
        />
        <link rel="canonical" href="https://malvinai.com/faq" />
      </Helmet>
      <div
        className="animate delay-1"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100%',
          padding: '40px 24px 80px 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '800px', width: '100%', textAlign: 'left' }}>
          <h2
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              marginBottom: '12px',
              background: 'linear-gradient(90deg, #ffffff 50%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Frequently Asked Questions
          </h2>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#06b6d4', marginBottom: '40px' }}>
            Everything you need to know before you scan, order, or book.
          </h3>

          {SECTIONS.map((section, sIdx) => (
            <div key={section.heading} style={{ marginBottom: '36px' }}>
              <h4
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '14px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {section.heading}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.items.map((item, iIdx) => {
                  const key = `${sIdx}-${iIdx}`;
                  const isOpen = openKey === key;
                  return (
                    <div
                      key={key}
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        background: isOpen ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.015)',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '16px 18px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: isOpen ? '#06b6d4' : '#ffffff' }}>
                          {item.q}
                        </span>
                        <ChevronDown
                          size={18}
                          color={isOpen ? '#06b6d4' : 'rgba(255,255,255,0.4)'}
                          style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                        />
                      </button>
                      {isOpen && (
                        <p
                          style={{
                            margin: 0,
                            padding: '0 18px 18px 18px',
                            fontSize: '0.98rem',
                            lineHeight: 1.7,
                            color: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div
            style={{
              background: 'rgba(6, 182, 212, 0.05)',
              borderLeft: '4px solid #06b6d4',
              padding: '18px 20px',
              borderRadius: '0 12px 12px 0',
              marginTop: '20px',
            }}
          >
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
              Still have a question?
            </p>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.65)', margin: '6px 0 0' }}>
              Reach out through the business you're working with directly, or contact Malvin support from inside the app.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQ;
