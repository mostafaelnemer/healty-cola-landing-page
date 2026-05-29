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

export function trackBrowserEventOnce(eventName, params, eventId) {
  if (!eventId || typeof window.fbq !== 'function') return false
  const key = `hc_meta_${eventName}_${eventId}`
  try {
    if (sessionStorage.getItem(key) === '1') return false
    sessionStorage.setItem(key, '1')
  } catch {
    /* continue */
  }
  window.fbq('track', eventName, params, { eventID: eventId })
  return true
}

export function buildPurchaseMeta({ value, contentName, eventId }) {
  const id = eventId || createMetaEventId('purchase')
  return {
    eventId: id,
    eventTime: Math.floor(Date.now() / 1000),
    eventName: 'Purchase',
    eventParams: {
      value,
      currency: 'EGP',
      content_name: contentName,
      content_type: 'product',
    },
  }
}
