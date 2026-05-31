export const FB_PIXEL_ID = '2267627306980280'

const ORDER_PURCHASE_SENT_KEY = 'hc_order_purchase_sent'

export function createMetaEventId(prefix = 'evt') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

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

/**
 * Fire a browser Pixel event exactly once per eventId.
 * params MUST include { value: Number, currency: String } for Purchase events.
 */
export function trackBrowserEventOnce(eventName, params, eventId) {
  if (!eventId || typeof window.fbq !== 'function') return false
  const key = `hc_meta_${eventName}_${eventId}`
  try {
    if (sessionStorage.getItem(key) === '1') return false
    sessionStorage.setItem(key, '1')
  } catch {
    /* continue even if sessionStorage is unavailable */
  }

  // Debug log — remove after confirming Meta receives value correctly
  console.log('[MetaPixel] Firing event:', {
    event_name: eventName,
    value: params.value,
    currency: params.currency,
    event_id: eventId,
    params,
  })

  window.fbq('track', eventName, params, { eventID: eventId })
  return true
}

/**
 * Build the shared meta payload for a Purchase event.
 * value MUST be a plain Number (e.g. 648), never a string like "648 ج.م".
 */
export function buildPurchaseMeta({ value, contentName, eventId }) {
  const id = eventId || createMetaEventId('purchase')
  const numericValue = Number(value)

  // Debug log — remove after confirming Meta receives value correctly
  console.log('[MetaTracking] buildPurchaseMeta:', {
    raw_value: value,
    numeric_value: numericValue,
    content_name: contentName,
    event_id: id,
  })

  return {
    eventId: id,
    eventTime: Math.floor(Date.now() / 1000),
    eventName: 'Purchase',
    eventParams: {
      value: numericValue,       // plain Number — e.g. 648
      currency: 'EGP',
      content_name: contentName,
      content_type: 'product',
    },
  }
}
