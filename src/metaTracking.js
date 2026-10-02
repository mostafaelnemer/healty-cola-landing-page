export const FB_PIXEL_ID = '2267627306980280'

// Google Apps Script web app. It writes Purchase orders to Sheets and relays
// every event to the Meta Conversions API using the event_id minted here.
export const ORDER_API_URL = 'https://script.google.com/macros/s/AKfycbyi-vUuVLklwANBh54MZtHjyzHZfAlq1rXWcTqTm8cJDO4QRrHM2d4nXJFW0HbhdyMrZw/exec'

// ─── EVENT ID ─────────────────────────────────────────────────────────────────
/**
 * Format: "<prefix>_<uuid>" — e.g. "purchase_550e8400-e29b-41d4-a716-446655440000".
 * The SAME id goes to fbq() and to CAPI; that shared id is the only thing Meta
 * uses to deduplicate the browser event against the server one.
 */
export function createMetaEventId(prefix = 'evt') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// One id per session per event, so reloads and React re-mounts replay the same
// id instead of minting a second event Meta cannot match. Purchase keeps its
// pre-existing key so sessions already in flight survive the deploy.
const SESSION_EVENT_ID_KEYS = {
  ViewContent: 'hc_viewcontent_event_id',
  AddToCart: 'hc_addtocart_event_id',
  Purchase: 'hc_order_purchase_event_id',
}

export function getSessionEventId(eventName) {
  const key = SESSION_EVENT_ID_KEYS[eventName]
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
  } catch {
    /* sessionStorage unavailable — fall through to a fresh id */
  }

  const eventId = createMetaEventId(eventName.toLowerCase())
  try {
    sessionStorage.setItem(key, eventId)
  } catch {
    /* ignore */
  }
  return eventId
}

// ─── ORDER-LEVEL DEDUP (Purchase) ─────────────────────────────────────────────
const ORDER_PURCHASE_SENT_KEY = 'hc_order_purchase_sent'

export function wasOrderPurchaseSent() {
  try {
    return sessionStorage.getItem(ORDER_PURCHASE_SENT_KEY) === '1'
  } catch {
    return false
  }
}

export function markOrderPurchaseSent() {
  try {
    sessionStorage.setItem(ORDER_PURCHASE_SENT_KEY, '1')
  } catch {
    /* ignore */
  }
}

// ─── USER SIGNALS (Event Match Quality) ───────────────────────────────────────
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function getFbc() {
  const existing = getCookie('_fbc')
  if (existing) return existing
  const fbclid = new URLSearchParams(window.location.search).get('fbclid')
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : ''
}

// ─── SERVER EVENT (CAPI) ──────────────────────────────────────────────────────
/**
 * POST, not GET: the Purchase query string already reaches ~1.9 KB with eventId
 * sitting near the end, so a larger order risked losing it to URL length limits —
 * a server Purchase with no event_id cannot be deduplicated. A body has no such
 * limit. fbp/fbc/agent are attached automatically for every event.
 */
export function sendServerEvent(fields) {
  const body = new URLSearchParams({
    eventSourceUrl: window.location.href,
    fbp: getCookie('_fbp'),
    fbc: getFbc(),
    userAgent: navigator.userAgent,
    ...fields,
  })

  fetch(ORDER_API_URL, {
    method: 'POST',
    mode: 'no-cors',
    keepalive: true,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }).catch(() => {})
}

// ─── PIXEL FIRE (event-level dedup) ───────────────────────────────────────────
/**
 * Fire a browser Pixel event exactly once per (eventName + eventId) pair.
 * params.value MUST be a plain Number (e.g. 648), never "648 ج.م".
 * The eventID option is what Meta matches against the CAPI event_id.
 */
export function trackBrowserEventOnce(eventName, params, eventId) {
  if (!eventId) return false
  if (typeof window.fbq !== 'function') {
    console.warn('[MetaPixel] fbq unavailable (blocked or not loaded yet):', eventName)
    return false
  }

  const key = `hc_meta_${eventName}_${eventId}`
  try {
    if (sessionStorage.getItem(key) === '1') {
      console.warn('[MetaPixel] Blocked duplicate pixel fire:', eventName, eventId)
      return false
    }
    sessionStorage.setItem(key, '1')
  } catch {
    console.warn('[MetaPixel] sessionStorage unavailable, dedup key not stored')
  }

  console.log('[MetaPixel] Firing:', {
    event_name: eventName,
    event_id: eventId,
    value: params.value,
    currency: params.currency,
  })

  window.fbq('track', eventName, params, { eventID: eventId })
  return true
}

// ─── BROWSER + SERVER PAIR ────────────────────────────────────────────────────
/**
 * Claim the right to send one server event per session. Mirrors the
 * wasOrderPurchaseSent() guard: ViewContent fires on every page view, so without
 * this a reload (or a dev-mode remount) burns an Apps Script quota slot sending
 * an event_id the cache would reject anyway.
 */
function claimServerSend(eventName) {
  const key = `hc_capi_${eventName}`
  try {
    if (sessionStorage.getItem(key) === '1') return false
    sessionStorage.setItem(key, '1')
  } catch {
    /* sessionStorage unavailable — send it; Meta still dedups on event_id */
  }
  return true
}

/**
 * Fire one event on both channels with an identical event_id.
 *
 * The server call is not gated on the browser one succeeding: when an ad-blocker
 * strips fbq, CAPI is the only channel left, which is exactly why it exists.
 */
export function trackMetaEvent(eventName, params, contentName = '') {
  const eventId = getSessionEventId(eventName)

  trackBrowserEventOnce(eventName, params, eventId)

  if (claimServerSend(eventName)) {
    sendServerEvent({
      eventName,
      eventId,
      eventTime: String(Math.floor(Date.now() / 1000)),
      value: params.value == null ? '' : String(params.value),
      contentName,
    })
  }

  return eventId
}

// ─── PURCHASE META BUILDER ────────────────────────────────────────────────────
/**
 * Build the shared Purchase payload. Call ONCE per order and reuse the result
 * for both the Pixel call and the CAPI request.
 */
export function buildPurchaseMeta({ value, contentName, eventId }) {
  const id = eventId || getSessionEventId('Purchase')
  const numericValue = Number(value)

  if (isNaN(numericValue)) {
    console.error('[MetaTracking] buildPurchaseMeta: value is NaN — raw value was:', value)
  }

  return {
    eventId: id,
    eventTime: Math.floor(Date.now() / 1000),
    eventName: 'Purchase',
    eventParams: {
      value: numericValue,
      currency: 'EGP',
      content_name: contentName,
      content_type: 'product',
    },
  }
}
