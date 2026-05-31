export const FB_PIXEL_ID = '2267627306980280'

// ─── SESSION KEYS ─────────────────────────────────────────────────────────────
// One key per order-level event (Purchase). Prevents re-fire across re-renders.
const ORDER_PURCHASE_SENT_KEY = 'hc_order_purchase_sent'

// ─── EVENT ID ─────────────────────────────────────────────────────────────────
/**
 * Generate a unique event ID.
 * Format: "<prefix>_<uuid>" — e.g. "purchase_550e8400-e29b-41d4-a716-446655440000"
 * The SAME id must be sent to both fbq() and CAPI. Never regenerate on the server.
 */
export function createMetaEventId(prefix = 'evt') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// ─── ORDER-LEVEL DEDUP (Purchase) ─────────────────────────────────────────────
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
    /* ignore — sessionStorage unavailable (private browsing edge case) */
  }
}

// ─── PIXEL FIRE (event-level dedup) ───────────────────────────────────────────
/**
 * Fire a browser Pixel event exactly once per (eventName + eventId) pair.
 *
 * Deduplication key: sessionStorage["hc_meta_<eventName>_<eventId>"]
 * This is separate from the order-level guard so each unique eventId
 * can fire exactly once even if the component re-renders.
 *
 * For Purchase: params MUST be { value: Number, currency: 'EGP', ... }
 * The eventID option passed to fbq() MUST match the event_id sent to CAPI.
 */
export function trackBrowserEventOnce(eventName, params, eventId) {
  if (!eventId || typeof window.fbq !== 'function') return false

  const key = `hc_meta_${eventName}_${eventId}`
  try {
    if (sessionStorage.getItem(key) === '1') {
      console.warn('[MetaPixel] Blocked duplicate pixel fire:', eventName, eventId)
      return false
    }
    sessionStorage.setItem(key, '1')
  } catch {
    /* sessionStorage unavailable — proceed but log */
    console.warn('[MetaPixel] sessionStorage unavailable, dedup key not stored')
  }

  // Debug log — verify value/currency/event_id before dispatch
  console.log('[MetaPixel] Firing:', {
    event_name: eventName,
    event_id: eventId,
    value: params.value,
    currency: params.currency,
    typeof_value: typeof params.value,
  })

  // eventID in the options object is what Meta uses for Pixel ↔ CAPI deduplication
  window.fbq('track', eventName, params, { eventID: eventId })
  return true
}

// ─── PURCHASE META BUILDER ────────────────────────────────────────────────────
/**
 * Build the shared Purchase event payload.
 *
 * IMPORTANT: call this ONCE per order and reuse the returned object for
 * BOTH the Pixel call and the CAPI request. Never call buildPurchaseMeta()
 * twice for the same order — each call generates a new eventId.
 *
 * value MUST be a plain Number (e.g. 648), never a formatted string ("648 ج.م").
 */
export function buildPurchaseMeta({ value, contentName, eventId }) {
  const id = eventId || createMetaEventId('purchase')
  const numericValue = Number(value)

  if (isNaN(numericValue)) {
    console.error('[MetaTracking] buildPurchaseMeta: value is NaN — raw value was:', value)
  }

  // Debug log — verify before sending
  console.log('[MetaTracking] buildPurchaseMeta:', {
    event_id: id,
    raw_value: value,
    numeric_value: numericValue,
    content_name: contentName,
  })

  return {
    eventId: id,                              // shared key for Pixel + CAPI
    eventTime: Math.floor(Date.now() / 1000), // Unix timestamp (seconds)
    eventName: 'Purchase',
    eventParams: {
      value: numericValue,   // plain Number — e.g. 648
      currency: 'EGP',
      content_name: contentName,
      content_type: 'product',
    },
  }
}
