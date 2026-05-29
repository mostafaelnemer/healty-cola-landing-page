import { useState, useRef } from 'react'
import { buildPurchaseMeta, createMetaEventId, markOrderPurchaseSent, trackBrowserEventOnce, wasOrderPurchaseSent } from './metaTracking'
import { CheckCircle2, Phone, Mail } from 'lucide-react'
import healthyCola from './assets/healthy_cola.png'
import healthyLemon from './assets/healthy_lemon.png'
import logo from './assets/logo.png'
import offerSummer from './assets/summer.jpeg'
import offerLama from './assets/lama.jpeg'
import offerShrink from './assets/shrink.jpeg'
import offerCombo from './assets/combo.jpeg'
import './App.css'

// ─── DATA ────────────────────────────────────────────────────────────────────

const HEALTHY_COLA_VOLUME_ML = 350
const HEALTHY_COLA_SIZE = `${HEALTHY_COLA_VOLUME_ML} مل`

const HEALTHY_LEMON_VOLUME_ML = 350
const HEALTHY_LEMON_SIZE = `${HEALTHY_LEMON_VOLUME_ML} مل`

/** ملخص الأحجام الرسمية للطلب (كولا + ليمون نعناع) */
const PRODUCT_SIZES_LABEL = `كولا ${HEALTHY_COLA_SIZE} · ليمون نعناع ${HEALTHY_LEMON_SIZE}`

const DELIVERY_FEE = 49
const SHRINK_LABEL = 'شرنك (12 عبوة)'
const SHIPPING_ONCE_LABEL = 'شحن الطلب 49 ج.م مرة واحدة'
const DELIVERY_HOURS_LABEL = 'التوصيل خلال ساعات من تأكيد الطلب'

/** ثقة الشراء — تظهر مرة واحدة أسفل العروض فقط */
const offerTrustBadges = [
  { icon: '💳', label: 'الدفع عند الاستلام' },
  { icon: '📞', label: 'تأكيد الطلب سريع' },
]

// الشحن يُطبَّق مرة واحدة لكل طلب (order) مهما تعددت الباقات أو الكميات — وليس على كل منتج/باقة.
const calcItemsSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.bundle.price * item.qty, 0)

const calcItemsOriginalSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.bundle.originalPrice * item.qty, 0)

/** total = مجموع المنتجات + شحن واحد فقط */
const calcOrderTotal = (items) => calcItemsSubtotal(items) + DELIVERY_FEE

const calcOrderOriginalTotal = (items) => calcItemsOriginalSubtotal(items) + DELIVERY_FEE

const bundles = [
  {
    id: 'summer',
    name: 'عرض الصيف',
    badge: '⭐ الأكثر طلبًا',
    description: `اشتري 2 ${SHRINK_LABEL} Healthy Cola (${HEALTHY_COLA_SIZE}) واحصل على ${SHRINK_LABEL} مجاناً + 5 Oat Bites مجاناً`,
    price: 599,
    originalPrice: 900,
    saving: 301,
    note: `2 ${SHRINK_LABEL} + ${SHRINK_LABEL} هدية + 5 Oat Bites — أقوى عرض الصيف.`,
    image: offerSummer,
    accent: '#F97316',
  },
  {
    id: 'combo',
    name: 'عرض الكومبو',
    badge: '🎁 عرض خاص',
    description: `12 عبوة Healthy Cola (${HEALTHY_COLA_SIZE} · ${SHRINK_LABEL}) + 6 قطع هدية من اختيارك`,
    price: 299,
    originalPrice: 450,
    saving: 151,
    note: `${SHRINK_LABEL} + هدية من اختيارك — أفضل قيمة.`,
    image: offerCombo,
    accent: '#6B21A8',
  },
  {
    id: 'month',
    name: 'عرض الشرنك',
    badge: 'وفر أكتر 🔥',
    description: `12 عبوة Healthy Cola (${HEALTHY_COLA_SIZE} · ${SHRINK_LABEL})`,
    price: 229,
    originalPrice: 300,
    saving: 71,
    note: `${SHRINK_LABEL} — يكفي البيت طول الشهر.`,
    image: offerShrink,
    accent: '#DC2626',
  },
  {
    id: 'lamma',
    name: 'عرض اللمة',
    badge: '☀️ عرض محدود',
    description: `5 عبوات Healthy Cola (${HEALTHY_COLA_SIZE})`,
    price: 99,
    originalPrice: 125,
    saving: 26,
    note: 'مثالي للّمة، الماتش، أو أي خروجة.',
    image: offerLama,
    accent: '#D4A017',
  },
]

/** Hero — القيم الأساسية فقط */
const heroPerks = [
  {label: '0 سكر' },
  {label: '0 سعرات' },
  {label: 'مناسب للكيتو' },
  {label: 'بدون أسبارتام' },
  {label: 'مناسبة لمرضى السكر' },
]

const benefitCards = [
  { icon: '🔥', title: 'طعم كولا حقيقي', text: 'صودا قوية، نكهة غنية، وطعم حقيقي في أي وقت من اليوم.' },
  { icon: '🌿', title: 'اختيار أذكى', text: 'استمتع بطعم الكولا اللي بتحبه من غير سكر مضاف ومن غير سعرات حرارية.' },
  { icon: '💪', title: 'لنمط حياتك', text: 'مناسب للرياضيين، مرضى السكر، نظام الكيتو، والأنظمة منخفضة السعرات.' },
  { icon: '🚀', title: 'طلب سريع', text: 'ادخل بياناتك — فريق Healthy Cola هيتواصل سريعاً للتأكيد، والتوصيل يبدأ خلال ساعات بعدها.' },
]

const egyptGovs = ['القاهرة', 'الجيزة', 'الإسكندرية']

const faqs = [
  { q: 'إيه حجم عبوة Healthy Cola؟', a: `نكهة الكولا ${HEALTHY_COLA_SIZE}، ونكهة ليمون نعناع ${HEALTHY_LEMON_SIZE}.` },
  { q: 'إيه حجم زجاجة ليمون نعناع؟', a: `حجم الزجاجة الرسمي ${HEALTHY_LEMON_SIZE}.` },
  { q: 'إيه معنى شرنك؟', a: `${SHRINK_LABEL} — أي 12 عبوة في العرض.` },
  { q: 'الشحن بيتكرر على كل باقة؟', a: `لا، ${SHIPPING_ONCE_LABEL} على الطلب بالكامل.` },
  { q: 'التوصيل بياخد قد إيه؟', a: 'فريق Healthy Cola بيتواصل سريعاً لتأكيد الطلب، والتوصيل يبدأ خلال ساعات بعد التأكيد. معظم الطلبات تصل في نفس اليوم حسب المنطقة.' },
  { q: 'هل Healthy Cola فيها سكر؟', a: 'لا، المنتج 0 سكر ومحلى بالاستيفيا بدل السكر التقليدي.' },
  { q: 'هل مناسبة لمرضى السكر والكيتو؟', a: 'نعم، لأنها 0 سعرات حرارية ومناسبة لمرضى السكر ونظام الكيتو دايت وأي نظام منخفض السعرات.' },
  { q: 'هل فيها أسبارتام؟', a: 'لا، Healthy Cola بدون أسبارتام تماماً.' },
  { q: 'أطلب إزاي؟', a: 'اختار العرض، أكمل بياناتك، وفريقنا هيتواصل معاك لتأكيد الطلب والتوصيل.' },
]

const ORDER_API_URL = 'https://script.google.com/macros/s/AKfycbyi-vUuVLklwANBh54MZtHjyzHZfAlq1rXWcTqTm8cJDO4QRrHM2d4nXJFW0HbhdyMrZw/exec'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

const getFbc = () => {
  const existing = getCookie('_fbc')
  if (existing) return existing
  const fbclid = new URLSearchParams(window.location.search).get('fbclid')
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : ''
}

// ─── TRUST & ORDER UI HELPERS ────────────────────────────────────────────────

function OfferTrustPills() {
  return (
    <div className="trust-pills trust-pills--offers">
      {offerTrustBadges.map((b) => (
        <span key={b.label}>{b.icon} {b.label}</span>
      ))}
    </div>
  )
}

function DeliveryHighlight({ compact = false }) {
  return (
    <p className={`delivery-highlight ${compact ? 'delivery-highlight--compact' : ''}`} role="note">
      ⚡ {DELIVERY_HOURS_LABEL}
    </p>
  )
}

function OrderExpectationBox() {
  return (
    <div className="order-expectation" role="note">
      <p><strong>بعد إرسال الطلب:</strong> فريق Healthy Cola هيتواصل معاك سريعاً لتأكيد الطلب.</p>
      <p>التوصيل يبدأ مباشرة بعد التأكيد — ومعظم الطلبات تصل في نفس اليوم أو خلال ساعات حسب منطقتك.</p>
    </div>
  )
}

function OrderTotalBreakdown({ subtotal, total, originalTotal, saving }) {
  return (
    <div className="order-breakdown" aria-label="تفاصيل الإجمالي">
      <div className="order-breakdown-row">
        <span>الاوردر</span>
        <span>{subtotal} ج.م</span>
      </div>
      <div className="order-breakdown-row">
        <span>الشحن</span>
        <span>{DELIVERY_FEE} ج.م</span>
      </div>
      <div className="order-breakdown-row order-breakdown-total">
        <span>الإجمالي</span>
        <div className="order-breakdown-total-val">
          <strong>{total} ج.م</strong>
          {originalTotal > total && <s>{originalTotal} ج.م</s>}
        </div>
      </div>
      {saving > 0 && (
        <p className="order-breakdown-saving">وفرت {saving} ج.م</p>
      )}
      <p className="order-breakdown-note">{SHIPPING_ONCE_LABEL}</p>
      <DeliveryHighlight compact />
    </div>
  )
}

// ─── FLAVOR PICKER COMPONENT ─────────────────────────────────────────────────

function FlavorPicker({ bundleId, qty, flavors, onChange, label, total: totalOverride, showHint = true }) {
  const perUnit = bundleId === 'lamma' ? 5 : bundleId === 'combo' ? 18 : bundleId === 'summer' ? 36 : 12
  const total = totalOverride !== undefined ? totalOverride : perUnit * qty
  const cola = flavors.cola ?? 0
  const lemon = flavors.lemon ?? (total - cola)

  const setCola = (val) => {
    const newCola = Math.max(0, Math.min(total, val))
    onChange({ cola: newCola, lemon: Math.max(0, total - newCola) })
  }
  const setLemon = (val) => {
    const newLemon = Math.max(0, Math.min(total, val))
    onChange({ cola: Math.max(0, total - newLemon), lemon: newLemon })
  }
  const setAll = (type) => {
    if (type === 'cola') onChange({ cola: total, lemon: 0 })
    else if (type === 'lemon') onChange({ cola: 0, lemon: total })
    else {
      const half = Math.floor(total / 2)
      onChange({ cola: total - half, lemon: half })
    }
  }

  return (
    <div className="flavor-section">
      <div className="flavor-header">
        <h3 className="flavor-title">{label || 'اختار توزيع النكهات'}</h3>
        <span className="flavor-badge">{total} عبوة · {HEALTHY_COLA_SIZE} / {HEALTHY_LEMON_SIZE}</span>
      </div>
      {showHint && (
        <p className="flavor-hint">
          يمكنك اختيار النكهات المفضلة بسهولة — اضغط «نص نص» للاختيار السريع. يمكن تعديل النكهات أثناء تأكيد الطلب.
        </p>
      )}
      <div className="flavor-quick-picks">
        <button
          type="button"
          className={`fqp-btn ${cola === total ? 'fqp-active-cola' : ''}`}
          onClick={() => setAll('cola')}
        >🥤 كله كولا</button>
        <button
          type="button"
          className={`fqp-btn fqp-btn--recommended ${cola === total - Math.floor(total / 2) && lemon === Math.floor(total / 2) ? 'fqp-active-half' : ''}`}
          onClick={() => setAll('half')}
        >⚖️ نص نص</button>
        <button
          type="button"
          className={`fqp-btn ${lemon === total ? 'fqp-active-lemon' : ''}`}
          onClick={() => setAll('lemon')}
        >🍋 كله ليمون</button>
      </div>
      <div className="flavor-grid">
        <div className={`flavor-card ${cola > 0 ? 'active-cola' : ''}`}>
          <div className="flavor-emoji">🥤</div>
          <div className="flavor-name">كولا</div>
          <div className="flavor-counter">
            <button type="button" className="fctr-btn" aria-label="زيادة كولا" onClick={() => setCola(cola + 1)} disabled={cola === total}>+</button>
            <span className="fctr-val">{cola}</span>
            <button type="button" className="fctr-btn" aria-label="تقليل كولا" onClick={() => setCola(cola - 1)} disabled={cola === 0}>−</button>
          </div>
        </div>
        <div className={`flavor-card ${lemon > 0 ? 'active-lemon' : ''}`}>
          <div className="flavor-emoji">🍋</div>
          <div className="flavor-name">ليمون نعناع</div>
          <div className="flavor-counter">
            <button type="button" className="fctr-btn" aria-label="زيادة ليمون" onClick={() => setLemon(lemon + 1)} disabled={lemon === total}>+</button>
            <span className="fctr-val">{lemon}</span>
            <button type="button" className="fctr-btn" aria-label="تقليل ليمون" onClick={() => setLemon(lemon - 1)} disabled={lemon === 0}>−</button>
          </div>
        </div>
      </div>
      <div className="flavor-bar-wrap">
        <div className="flavor-bar">
          <div className="flavor-bar-cola" style={{ width: `${(cola / total) * 100}%` }} />
          <div className="flavor-bar-lemon" style={{ width: `${(lemon / total) * 100}%` }} />
        </div>
        <div className="flavor-bar-labels">
          <span className="fbl cola">{cola} كولا</span>
          {lemon > 0 && <span className="fbl lemon">{lemon} ليمون نعناع</span>}
        </div>
      </div>
    </div>
  )
}

// ─── ORDER FORM ───────────────────────────────────────────────────────────────

function StepConfirm({ cartItems: initialItems, onBack }) {
  const [items, setItems] = useState(initialItems)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gov, setGov] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('idle')
  const purchaseSubmitLock = useRef(false)
  const [touched, setTouched] = useState({})
  const [itemFlavors, setItemFlavors] = useState(() =>
    initialItems.map(item => {
      const perUnit = item.bundle.id === 'lamma' ? 5 : item.bundle.id === 'combo' ? 18 : item.bundle.id === 'summer' ? 36 : 12
      const base = { cola: Math.floor((perUnit * item.qty) / 2) }
      return base
    })
  )

  const removeItem = (i) => {
    setItems(prev => prev.filter((_, idx) => idx !== i))
    setItemFlavors(prev => prev.filter((_, idx) => idx !== i))
  }

  if (items.length === 0) {
    onBack()
    return null
  }

  const cartItems = items
  const subtotal = calcItemsSubtotal(cartItems)
  const totalPrice = calcOrderTotal(cartItems)
  const totalOriginal = calcOrderOriginalTotal(cartItems)
  const totalSaving = totalOriginal - totalPrice

  const touch = (field) => setTouched(t => ({ ...t, [field]: true }))

  const errors = {
    name: !name.trim() ? 'الاسم مطلوب' : '',
    phone: !phone.trim() ? 'رقم الموبايل مطلوب' : !/^01[0-9]{9}$/.test(phone.trim()) ? 'رقم غير صحيح، مثال: 01XXXXXXXXX' : '',
    gov: !gov ? 'اختر محافظتك' : '',
    address: !address.trim() ? 'العنوان مطلوب' : address.trim().length < 10 ? 'اكتب العنوان بتفصيل أكتر' : '',
  }

  const buildOrderSummary = () =>
    cartItems.map((item, i) => {
      const perUnit = item.bundle.id === 'lamma' ? 5 : item.bundle.id === 'combo' ? 18 : item.bundle.id === 'summer' ? 36 : 12
      const total = perUnit * item.qty
      const cola = itemFlavors[i].cola ?? 0
      const lemon = itemFlavors[i].lemon ?? (total - cola)
      const summary = `${item.bundle.name} ×${item.qty} (${cola} كولا + ${lemon} ليمون)`
      return summary
    }).join(' | ')

  const buildOfferSummary = () =>
    cartItems.map((item) => `${item.bundle.name} ×${item.qty}`).join(' | ')

  const handleSubmit = async () => {
    if (status === 'sending' || status === 'done' || purchaseSubmitLock.current) return
    setTouched({ name: true, phone: true, gov: true, address: true })
    const currentErrors = {
      name: !name.trim() ? 'الاسم مطلوب' : '',
      phone: !phone.trim() ? 'رقم الموبايل مطلوب' : !/^01[0-9]{9}$/.test(phone.trim()) ? 'رقم غير صحيح، مثال: 01XXXXXXXXX' : '',
      gov: !gov ? 'اختر محافظتك' : '',
      address: !address.trim() ? 'العنوان مطلوب' : address.trim().length < 10 ? 'اكتب العنوان بتفصيل أكتر' : '',
    }
    const firstError = Object.keys(currentErrors).find(k => currentErrors[k])
    if (firstError) {
      document.getElementById(`field-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    purchaseSubmitLock.current = true
    setStatus('sending')
    try {
      const orderSummary = buildOrderSummary()
      const offerSummary = buildOfferSummary()
      if (wasOrderPurchaseSent()) {
        setStatus('done')
        return
      }

      const purchaseMeta = buildPurchaseMeta({ value: totalPrice, contentName: offerSummary })
      const { eventName, eventTime, eventId, eventParams } = purchaseMeta

      const orderPayload = new URLSearchParams({
        name,
        phone,
        gov,
        address,
        notes: notes || '',
        bundle: offerSummary,
        subtotal: `${subtotal} ج.م`,
        shippingFee: `${DELIVERY_FEE} ج.م`,
        price: `${totalPrice} ج.م`,
        quantity: String(cartItems.reduce((s, i) => s + i.qty, 0)),
        flavors: orderSummary,
        productWeight: PRODUCT_SIZES_LABEL,
        eventName,
        eventTime: String(eventTime),
        eventId,
        eventSourceUrl: window.location.href,
        fbp: getCookie('_fbp'),
        fbc: getFbc(),
        userAgent: navigator.userAgent,
      })

      // GET — Apps Script يقرأ e.parameter بشكل موثوق (POST + no-cors كان يفقد eventId)
      const orderUrl = `${ORDER_API_URL}?${orderPayload.toString()}`
      fetch(orderUrl, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {})

      // Browser Pixel — Purchase مع value صح (deduplication عبر eventId)
      trackBrowserEventOnce(eventName, eventParams, eventId)

      markOrderPurchaseSent()
      window.history.pushState({}, '', '/confirmation_order')
      setStatus('done')
    } catch {
      setStatus('done')
    } finally {
      purchaseSubmitLock.current = false
    }
  }

  if (status === 'done') {
    return (
      <div className="step-screen">
        <div className="order-success">
          <div className="success-anim">
            <div className="success-circle">
              <svg viewBox="0 0 52 52" className="success-svg">
                <circle cx="26" cy="26" r="25" fill="none" className="success-circle-bg" />
                <path d="M14 27l8 8 16-16" fill="none" className="success-check" />
              </svg>
            </div>
          </div>
          <h2>تم تسجيل طلبك!</h2>
          <p className="success-lead">سيتم التواصل معاك خلال وقت قصير لتأكيد الطلب.</p>
          <p className="success-lead success-lead--accent">التوصيل يبدأ خلال ساعات بعد التأكيد — ومعظم الطلبات تصل في نفس اليوم حسب المنطقة.</p>
          <DeliveryHighlight />
          <div className="success-card">
            <div className="success-card-row">
              <span className="success-label">المنتج</span>
              <span className="success-val">{PRODUCT_SIZES_LABEL}</span>
            </div>
            <div className="success-card-divider" />
            {cartItems.map((item, i) => {
              const perUnit = item.bundle.id === 'lamma' ? 5 : item.bundle.id === 'combo' ? 18 : item.bundle.id === 'summer' ? 36 : 12
              const total = perUnit * item.qty
              const cola = itemFlavors[i].cola ?? 0
              const lemon = itemFlavors[i].lemon ?? (total - cola)
              return (
                <div key={i}>
                  <div className="success-card-row">
                    <span className="success-label">{item.bundle.name}</span>
                    <span className="success-val">×{item.qty} — {item.bundle.price * item.qty} ج.م</span>
                  </div>
                  <div className="success-card-row">
                    <span className="success-label">النكهات</span>
                    <span className="success-val">{cola} كولا + {lemon} ليمون</span>
                  </div>
                  {i < cartItems.length - 1 && <div className="success-card-divider" />}
                </div>
              )
            })}
            <div className="success-card-divider" />
            <div className="success-card-row">
              <span className="success-label">المنتجات</span>
              <span className="success-val">{subtotal} ج.م</span>
            </div>
            <div className="success-card-row">
              <span className="success-label">الشحن (مرة واحدة)</span>
              <span className="success-val">{DELIVERY_FEE} ج.م</span>
            </div>
            <div className="success-card-row">
              <span className="success-label">الإجمالي</span>
              <span className="success-val price">{totalPrice} ج.م</span>
            </div>
            <div className="success-card-divider" />
            <div className="success-card-row">
              <span className="success-label">الاسم</span>
              <span className="success-val">{name}</span>
            </div>
            <div className="success-card-row">
              <span className="success-label">الموبايل</span>
              <span className="success-val">{phone}</span>
            </div>
            <div className="success-card-row">
              <span className="success-label">المحافظة</span>
              <span className="success-val">{gov}</span>
            </div>
          </div>
        </div>

        <button className="back-btn" style={{ marginTop: '12px' }} onClick={() => { window.history.pushState({}, '', '/'); onBack() }}>العودة للرئيسية</button>
      </div>
    )
  }

  return (
    <div className="step-screen">
      <div className="cart-summary-header">
        <span className="cart-summary-title">🛒 ملخص طلبك</span>
        <span className="cart-summary-total">{totalPrice} ج.م</span>
      </div>
      <OrderExpectationBox />
      <DeliveryHighlight />

      {cartItems.map((item, i) => (
        <div key={i}>
          <div className="confirm-summary" style={{ '--accent': item.bundle.accent }}>
            <div className="confirm-img">
              <img src={item.bundle.image} alt={`صورة ${item.bundle.name} في الطلب`} />
            </div>
            <div className="confirm-info">
              <div className="confirm-info-top">
                <h3>{item.bundle.name} {item.qty > 1 ? `× ${item.qty}` : ''}</h3>
                <button className="remove-item-btn" onClick={() => removeItem(i)} title="إزالة من السلة">✕</button>
              </div>
              <p>{item.bundle.description}</p>
              <div className="confirm-price">
                <strong>{item.bundle.price * item.qty} ج.م</strong>
                <s>{item.bundle.originalPrice * item.qty} ج.م</s>
              </div>
              <div className="confirm-badges">
                <span className="confirm-badge green">وفرت {item.bundle.saving * item.qty} ج.م</span>
              </div>
            </div>
          </div>
          <FlavorPicker
            bundleId={item.bundle.id}
            qty={item.qty}
            flavors={itemFlavors[i]}
            label={
              item.bundle.id === 'combo' ? 'اختار توزيع نكهات الـ 18 عبوة (12 + 6 هدية)' :
              item.bundle.id === 'summer' ? 'اختار توزيع نكهات الـ 36 عبوة (24 + 12 هدية)' :
              undefined
            }
            onChange={(f) => setItemFlavors(prev => prev.map((x, idx) => idx === i ? { ...x, ...f } : x))}
          />
        </div>
      ))}

      <OrderTotalBreakdown
        subtotal={subtotal}
        total={totalPrice}
        originalTotal={totalOriginal}
        saving={totalSaving}
      />
      <div className="form-section">
        <h2>بياناتك</h2>
        <p className="form-subtitle">أدخل بياناتك — فريق Healthy Cola هيتواصل سريعاً لتأكيد الطلب ثم يبدأ التوصيل</p>
        <div className="form-card">
          <div id="field-name" className={`field ${touched.name && errors.name ? 'field-error' : touched.name && !errors.name ? 'field-ok' : ''}`}>
            <label>الاسم <span className="req">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} onBlur={() => touch('name')} placeholder="اكتب اسمك الكامل" />
            {touched.name && errors.name && <p className="field-msg error">{errors.name}</p>}
          </div>
          <div id="field-phone" className={`field ${touched.phone && errors.phone ? 'field-error' : touched.phone && !errors.phone ? 'field-ok' : ''}`}>
            <label>رقم الموبايل <span className="req">*</span></label>
            <input value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => touch('phone')} placeholder="01XXXXXXXXX" type="tel" inputMode="numeric" maxLength={11} />
            {touched.phone && errors.phone && <p className="field-msg error">{errors.phone}</p>}
          </div>
          <div id="field-gov" className={`field ${touched.gov && errors.gov ? 'field-error' : touched.gov && !errors.gov ? 'field-ok' : ''}`}>
            <label>المحافظة <span className="req">*</span></label>
            <select value={gov} onChange={e => setGov(e.target.value)} onBlur={() => touch('gov')} className="select-field">
              <option value="">اختر محافظتك</option>
              {egyptGovs.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {touched.gov && errors.gov && <p className="field-msg error">{errors.gov}</p>}
          </div>
          <div id="field-address" className={`field ${touched.address && errors.address ? 'field-error' : touched.address && !errors.address ? 'field-ok' : ''}`}>
            <label>العنوان بالتفصيل <span className="req">*</span></label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} onBlur={() => touch('address')} placeholder="المدينة / الشارع / رقم المنزل / أي تفاصيل تساعد في التوصيل" rows={3} />
            {touched.address && errors.address && <p className="field-msg error">{errors.address}</p>}
          </div>
          <div className="field">
            <label>ملاحظات <span className="opt">(اختياري)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي ملاحظات إضافية على الطلب" rows={2} />
          </div>
        </div>
      </div>

      <button className="confirm-order-btn" onClick={handleSubmit} disabled={status === 'sending'}>
        {status === 'sending' ? '⏳ جاري تسجيل الطلب…' : 'تأكيد الطلب'}
      </button>
      <button className="back-btn" onClick={onBack}>رجوع</button>
    </div>
  )
}

// ─── LANDING (SCROLL PAGE) ───────────────────────────────────────────────────

function Landing({ onConfirm }) {
  const [openFaq, setOpenFaq] = useState(null)
  const [cart, setCart] = useState({})

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0)
  const cartItems = bundles
    .filter(b => (cart[b.id] || 0) > 0)
    .map(b => ({ bundle: b, qty: cart[b.id] }))
  const cartCheckoutTotal = calcOrderTotal(cartItems)

  const addToCart = (bundleId) => setCart(c => ({ ...c, [bundleId]: (c[bundleId] || 0) + 1 }))
  const setQty = (bundleId, val) => {
    if (val <= 0) {
      setCart(c => { const n = { ...c }; delete n[bundleId]; return n })
    } else {
      setCart(c => ({ ...c, [bundleId]: val }))
    }
  }

  const handleCheckout = () => {
    const items = bundles
      .filter(b => (cart[b.id] || 0) > 0)
      .map(b => ({ bundle: b, qty: cart[b.id] }))
    if (items.length === 0) return
    onConfirm(items)
  }

  const scrollToBundles = () => document.getElementById('bundles-section')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className={`landing ${cartCount > 0 ? 'landing--has-cart' : 'landing--sticky-cta'}`}>

      {/* STICKY CART BAR */}
      {cartCount > 0 && (
        <div className="sticky-cart-bar">
          <div className="sticky-cart-items">
            {bundles.filter(b => (cart[b.id] || 0) > 0).map(b => (
              <span key={b.id} className="sticky-cart-chip" style={{ '--accent': b.accent }}>
                {b.name} ×{cart[b.id]}
              </span>
            ))}
          </div>
          <button className="sticky-cart-btn" onClick={handleCheckout}>
            أكمل الطلب — {cartCheckoutTotal} ج.م ←
          </button>
        </div>
      )}

      <header className="topbar">
        <img src={logo} alt="Healthy & Tasty" className="topbar-logo" />
        <button type="button" className="topbar-cta" onClick={scrollToBundles}>
          اطلب الآن 🛒
        </button>
      </header>

      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow-pill">Healthy &amp; Tasty تقدم</p>
          <h1>
            استمتع بالكولا اللي بتحبها…
            <br />
            <span>بطريقة تناسب حياتك الصحية</span>
          </h1>
          <p className="hero-sub">
            من غير سكر… من غير سعرات حرارية… ومن غير ما تبوّظ نظامك
          </p>
          <DeliveryHighlight />
          <p className="hero-shipping-note">{SHIPPING_ONCE_LABEL}</p>
          <div className="perks-wrap">
            {heroPerks.map((f) => (
              <span className="perk" key={f.label}>
                <CheckCircle2 size={16} /> {f.icon} {f.label}
              </span>
            ))}
          </div>
          <div className="hero-btns">
            <button type="button" className="primary-btn" onClick={scrollToBundles}>
              🛒 اطلب عروض الكولا
            </button>
            <a className="secondary-btn" href="#bundles-section">شوف الباقات ↓</a>
          </div>
        </div>
        <div className="hero-can">
          <div className="can-glow" />
          <div className="hero-cans-duo">
            <div className="hero-can-item">
              <div className="bubbles-wrap">
                {[
                  { size: 18, left: 10, delay: 0, dur: 2.6 },
                  { size: 12, left: 28, delay: 0.5, dur: 2.0 },
                  { size: 22, left: 50, delay: 0.9, dur: 3.0 },
                  { size: 9, left: 68, delay: 1.4, dur: 2.3 },
                  { size: 16, left: 82, delay: 0.2, dur: 2.8 },
                  { size: 11, left: 38, delay: 1.8, dur: 2.1 },
                  { size: 20, left: 58, delay: 0.7, dur: 3.2 },
                  { size: 8, left: 20, delay: 2.1, dur: 2.4 },
                  { size: 15, left: 73, delay: 1.1, dur: 2.7 },
                  { size: 10, left: 45, delay: 2.5, dur: 2.0 },
                ].map((b, i) => (
                  <span key={i} className="bubble" style={{ '--size': `${b.size}px`, '--left': `${b.left}%`, '--delay': `${b.delay}s`, '--dur': `${b.dur}s` }} />
                ))}
              </div>
              <div className="bottle-platform" />
              <img src={healthyCola} alt={`عبوة Healthy Cola بنكهة الكولا — ${HEALTHY_COLA_SIZE}`} />
              <div className="bottle-label">كولا · {HEALTHY_COLA_SIZE}</div>
            </div>
            <div className="hero-can-item lemon">
              <div className="bubbles-wrap">
                {[
                  { size: 14, left: 15, delay: 0.3, dur: 2.5 },
                  { size: 20, left: 35, delay: 0, dur: 2.9 },
                  { size: 9, left: 55, delay: 1.0, dur: 2.2 },
                  { size: 17, left: 70, delay: 0.6, dur: 3.1 },
                  { size: 11, left: 25, delay: 1.5, dur: 2.0 },
                  { size: 19, left: 48, delay: 0.4, dur: 2.7 },
                  { size: 8, left: 80, delay: 1.9, dur: 2.3 },
                  { size: 13, left: 60, delay: 0.8, dur: 3.0 },
                  { size: 16, left: 30, delay: 2.2, dur: 2.6 },
                  { size: 10, left: 75, delay: 1.3, dur: 2.1 },
                ].map((b, i) => (
                  <span key={i} className="bubble bubble--lemon" style={{ '--size': `${b.size}px`, '--left': `${b.left}%`, '--delay': `${b.delay}s`, '--dur': `${b.dur}s` }} />
                ))}
              </div>
              <div className="bottle-platform lemon-platform" />
              <img src={healthyLemon} alt={`زجاجة Healthy Cola ليمون نعناع — ${HEALTHY_LEMON_SIZE}`} />
              <div className="bottle-label lemon-label">
                <span className="bottle-label-line">ليمون نعناع · {HEALTHY_LEMON_SIZE}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section dark-section" id="bundles-section">
        <div className="section-head light">
          <p className="eyebrow-pill light">اختار العرض المناسب لك 👇</p>
          <h2>الباقة المناسبة ليك</h2>
          <p>كل العروض والدفع عند الاستلام 💳 · {SHIPPING_ONCE_LABEL}</p>
          <DeliveryHighlight compact />
        </div>
        <div className="bundle-list">
          {bundles.map((bundle) => {
            const qty = cart[bundle.id] || 0
            const inCart = qty > 0
            const selectBundle = () => {
              if (!inCart) addToCart(bundle.id)
            }

            return (
              <div
                key={bundle.id}
                role="button"
                tabIndex={0}
                aria-pressed={inCart}
                aria-label={`${bundle.name}${inCart ? ' — مختار في السلة' : ' — اضغط لاختيار العرض'}`}
                className={`bundle-row bundle-row-${bundle.id} ${inCart ? 'selected' : ''}`}
                style={{ '--accent': bundle.accent }}
                onClick={selectBundle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectBundle()
                  }
                }}
              >
                {inCart && <div className="selected-check">✓</div>}
                {bundle.badge && <div className="bundle-row-badge">{bundle.badge}</div>}
                <div className="bundle-row-img">
                  <img src={bundle.image} alt={`صورة ${bundle.name} — Healthy Cola`} loading="lazy" />
                </div>
                <div className="bundle-row-info">
                  <h3>{bundle.name}</h3>
                  <p>{bundle.description}</p>
                  <p className="bundle-row-note">{bundle.note}</p>
                  <div className="bundle-row-price">
                    <strong>{bundle.price * Math.max(qty, 1)} ج.م</strong>
                    <s>{bundle.originalPrice * Math.max(qty, 1)} ج.م</s>
                    <span className="saving-tag">وفر {bundle.saving * Math.max(qty, 1)} ج.م</span>
                  </div>
                  <div className="bundle-row-actions" onClick={e => e.stopPropagation()}>
                    {inCart ? (
                      <div className="bundle-qty">
                        <button type="button" className="qty-btn" aria-label="تقليل الكمية" onClick={() => setQty(bundle.id, qty - 1)}>−</button>
                        <span className="qty-val">{qty}</span>
                        <button type="button" className="qty-btn" aria-label="زيادة الكمية" onClick={() => setQty(bundle.id, qty + 1)}>+</button>
                      </div>
                    ) : (
                      <button type="button" className="add-to-cart-btn" onClick={() => addToCart(bundle.id)}>
                        🛒 أضف للسلة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <OfferTrustPills />
        {cartCount > 0 && (
          <button type="button" className="next-btn landing-next-btn" onClick={handleCheckout}>
            أكمل الطلب ({cartCount} قطعة — {cartCheckoutTotal} ج.م شامل الشحن مرة واحدة) ←
          </button>
        )}
      </section>

      <section className="section" id="benefits-section">
        <div className="section-head">
          <p className="eyebrow-pill">ليه Healthy Cola؟</p>
          <h2>نفس إحساس الكولا… باختيار أذكى</h2>
          <p>كولا {HEALTHY_COLA_SIZE} · ليمون نعناع {HEALTHY_LEMON_SIZE}.</p>
        </div>
        <div className="benefit-grid">
          {benefitCards.map((b) => (
            <div className="benefit-card" key={b.title}>
              <span className="benefit-icon">{b.icon}</span>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section dark-section">
        <div className="section-head light">
          <p className="eyebrow-pill light">الطلب بسيط</p>
          <h2>3 خطوات وتستلم عرضك</h2>
        </div>
        <div className="steps-grid">
          {[
            { n: '1', title: 'اختار العرض', text: 'حدد الباقة المناسبة ليك واختار النكهات بسهولة.' },
            { n: '2', title: 'ادخل بياناتك', text: 'اسمك وعنوانك — فريق Healthy Cola هيتواصل سريعاً للتأكيد.' },
            { n: '3', title: 'استلم خلال ساعات', text: 'التوصيل يبدأ بعد التأكيد — ومعظم الطلبات تصل في نفس اليوم حسب المنطقة.' },
          ].map((s) => (
            <div className="step-card" key={s.n}>
              <span className="step-num">{s.n}</span>
              <div className="step-card-text">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="faq">
        <div className="section-head">
          <p className="eyebrow-pill">الأسئلة الشائعة</p>
          <h2>كل اللي محتاج تعرفه قبل الطلب</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item, i) => (
            <div className={`faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
              <button
                type="button"
                className="faq-q"
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className="faq-arrow" aria-hidden="true">{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && <p className="faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {cartCount === 0 && (
        <button type="button" className="sticky-cta" onClick={scrollToBundles}>
          🛒 اطلب الآن — {DELIVERY_HOURS_LABEL}
        </button>
      )}

      <footer className="footer">
        <img src={logo} alt="شعار Healthy and Tasty" className="footer-logo" />
        <div className="footer-links">
          <a href="tel:+201100863802"><Phone size={16} /> اتصال</a>
          <a href="mailto:care@healthyandtasty.store"><Mail size={16} /> إيميل</a>
        </div>
      </footer>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function App() {
  const [flow, setFlow] = useState('landing')
  const [cartItems, setCartItems] = useState([])

  if (flow === 'landing') {
    return (
      <Landing
        onConfirm={(items) => {
          setCartItems(items)
          setFlow('form')
          window.scrollTo({ top: 0, behavior: 'instant' })
          window.history.pushState({}, '', '/add_to_cart')
          trackBrowserEventOnce(
            'AddToCart',
            { currency: 'EGP', content_type: 'product' },
            createMetaEventId('addtocart'),
          )
        }}
      />
    )
  }

  return (
    <main className="funnel" dir="rtl" lang="ar">
      <div className="funnel-header">
        <button type="button" className="funnel-back-btn" onClick={() => { setFlow('landing'); window.scrollTo({ top: 0, behavior: 'instant' }) }}>
          &#8594; رجوع
        </button>
        <img src={logo} alt="Healthy &amp; Tasty" className="topbar-logo" />
      </div>
      <StepConfirm
        cartItems={cartItems}
        onBack={() => { setFlow('landing'); window.history.pushState({}, '', '/'); window.scrollTo({ top: 0, behavior: 'instant' }) }}
      />
    </main>
  )
}

export default App
