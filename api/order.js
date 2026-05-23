const SHEET_URL = 'https://script.google.com/macros/s/AKfycbys3iOqUVekPRy6hHdTGx6_D0myLmmn2lisjTYWh0-QO03RNU5kQ9a2tvVbogyg7rYuIw/exec'

// Purchase يُرسل عبر Google Apps Script (CAPI) فقط — لا تفعّل FB_* هنا لتجنب تكرار الأحداث

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { name, phone, gov, address, notes, bundle, price, subtotal, shippingFee, flavors, quantity, productWeight } = req.body

  // رد فوري على الـ user
  res.status(200).json({ result: 'success' })

  // Google Sheets في الـ background
  const params = new URLSearchParams({
    name: name || '',
    phone: phone || '',
    gov: gov || '',
    address: address || '',
    notes: notes || '',
    bundle: bundle || '',
    subtotal: subtotal || '',
    shippingFee: shippingFee || '49 ج.م',
    price: price || '',
    flavors: flavors || '-',
    quantity: quantity || '1',
    productWeight: productWeight || 'كولا 350 مل · ليمون نعناع 350 مل',
  })
  fetch(`${SHEET_URL}?${params.toString()}`).catch(() => {})
}
