import { shippingLabel, shippingSummary, cartShipping, cartShippingLabel, shippingOrderNote } from './shipping.js'
import { usePageContent } from './PageContent.jsx'
import { useEffect, useRef, useState } from 'react'
import { buildPurchaseMeta, markOrderPurchaseSent, sendServerEvent, trackBrowserEventOnce, trackMetaEvent, wasOrderPurchaseSent } from './metaTracking'
import { CheckCircle2, Phone, Mail } from 'lucide-react'
import canCola from './assets/cola.jpeg'
import canPineapple from './assets/pineapple.jpeg'
import canLemonMint from './assets/lemon_mint.jpeg'
import canOrange from './assets/orange.jpeg'
import canGreenApple from './assets/green_apple.jpeg'
import canMixBerries from './assets/mix_berries.jpeg'
import logo from './assets/logo.png'
import offerThirtyCans from './assets/offer_30_cans.jpeg'
import offerFivePlusOne from './assets/offer_5_plus_1.jpeg'
import { useOffers } from './useOffers'
import './App.css'

// ─── DATA ────────────────────────────────────────────────────────────────────

const CAN_VOLUME_ML = 250
const CAN_SIZE = `${CAN_VOLUME_ML} مل`
const FLAVOR_COUNT_LABEL = '6 نكهات'

/** ملخص الأحجام الرسمية للطلب — كانز 250 مل بست نكهات */
const PRODUCT_SIZES_LABEL = `كانز ${CAN_SIZE} · ${FLAVOR_COUNT_LABEL}`

const SHIPPING_ONCE_LABEL = 'أعلى رسوم شحن تُحسب مرة واحدة على الطلب'
const DELIVERY_HOURS_LABEL = 'التوصيل خلال ساعات من تأكيد الطلب'

/** ثقة الشراء — تظهر مرة واحدة أسفل العروض فقط */
const offerTrustBadges = [
  { icon: '💳', label: 'الدفع عند الاستلام' },
  { icon: '📞', label: 'تأكيد الطلب سريع' },
]

// Highest applicable shipping fee is charged once, regardless of quantity.
const calcItemsSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.bundle.price * item.qty, 0)

const calcItemsOriginalSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.bundle.originalPrice * item.qty, 0)

const calcShipping = (items) => cartShipping(items, 'cola').fee

/** total = مجموع المنتجات + شحن واحد فقط (أو مجاني) */
const calcOrderTotal = (items) => calcItemsSubtotal(items) + calcShipping(items)

const calcOrderOriginalTotal = (items) => calcItemsOriginalSubtotal(items) + calcShipping(items)

/** عدد العبوات في العرض الواحد — بييجي من الداشبورد (units) */
const unitsPerBundle = (bundle) => Math.max(1, Number(bundle?.units) || 12)

/** العروض المحلية: fallback + مصدر الصور المحلية. الـ id هنا لازم يطابق الـ slug في الداشبورد */
const LOCAL_BUNDLES = [
  {
    id: 'summer',
    name: 'عرض الـ 30 كانز',
    badge: '⭐ الأكثر توفيرًا',
    description: `30 كانز Healthy Cola (${CAN_SIZE}) — ${FLAVOR_COUNT_LABEL} من اختيارك`,
    price: 600,
    units: 30,
    originalPrice: 725,
    saving: 125,
    note: 'أوفر سعر — 30 كانز بـ 600 جنيه بدل 725.',
    deliveryNote: 'الشحن يُحدد مع الكول سنتر',
    shippingMode: 'call_center',
    freeShipping: false,
    image: offerThirtyCans,
    accent: '#6B21A8',
  },
  {
    id: 'combo',
    name: 'عرض 5 + 1 هدية',
    badge: '🎁 الكانز السادسة هدية',
    description: `اشتري 5 كانز Healthy Cola (${CAN_SIZE}) واحصل على الكانز السادسة هدية`,
    price: 125,
    units: 6,
    originalPrice: 150,
    saving: 25,
    note: '5 كانز + كانز هدية — جرّب كل النكهات.',
    deliveryNote: 'الشحن يُحدد مع الكول سنتر',
    shippingMode: 'call_center',
    freeShipping: false,
    image: offerFivePlusOne,
    accent: '#DC2626',
  },
]

/** Hero — القيم الأساسية فقط */
const heroPerks = [
  {label: '0 سكر' },
  {label: '0 سعرات' },
  {label: '6 نكهات' },
  {label: 'مناسب للكيتو' },
  {label: 'بدون أسبارتام' },
  {label: 'مناسبة لمرضى السكر' },
]

const flavorShowcase = [
  { name: 'كولا', en: 'Cola', desc: 'الطعم الأصلي اللي بتحبه — صودا غنية بدون سكر.', image: canCola, accent: '#E63946' },
  { name: 'أناناس', en: 'Pineapple', desc: 'انتعاش استوائي حلو من غير سعرات.', image: canPineapple, accent: '#CA8A04' },
  { name: 'ليمون نعناع', en: 'Lemon Mint', desc: 'ليمون منعش مع نعناع بارد في كل رشفة.', image: canLemonMint, accent: '#65A30D' },
  { name: 'برتقال', en: 'Orange', desc: 'برتقال طبيعي وخفيف على المعدة.', image: canOrange, accent: '#F97316' },
  { name: 'تفاح أخضر', en: 'Green Apple', desc: 'تفاح أخضر مقرمش وانتعاش طويل.', image: canGreenApple, accent: '#84CC16' },
  { name: 'توت مشكل', en: 'Mix Berries', desc: 'خلطة توت غنية وطعم مميز.', image: canMixBerries, accent: '#7E22CE' },
]

const benefitCards = [
  { icon: '🔥', title: 'طعم كولا حقيقي', text: 'صودا قوية، نكهة غنية، وطعم حقيقي في أي وقت من اليوم.' },
  { icon: '🌈', title: '6 نكهات مختلفة', text: 'كولا، أناناس، ليمون نعناع، برتقال، تفاح أخضر، وتوت مشكل — اختار اللي يعجبك.' },
  { icon: '💪', title: 'لنمط حياتك', text: 'مناسب للرياضيين، مرضى السكر، نظام الكيتو، والأنظمة منخفضة السعرات.' },
  { icon: '🚀', title: 'طلب سريع', text: 'ادخل بياناتك — فريق Healthy Cola هيتواصل سريعاً للتأكيد، والتوصيل يبدأ خلال ساعات بعدها.' },
]

const egyptGovs = ['القاهرة', 'الجيزة', 'الإسكندرية', 'دمياط', 'طنطا', 'المنصورة', 'السويس']

const faqs = [
  { q: 'إيه حجم كانز Healthy Cola؟', a: `كل الكانزات ${CAN_SIZE} — ${FLAVOR_COUNT_LABEL}: كولا، أناناس، ليمون نعناع، برتقال، تفاح أخضر، وتوت مشكل.` },
  { q: 'إيه النكهات المتاحة؟', a: `6 نكهات: كولا، أناناس، ليمون نعناع، برتقال، تفاح أخضر، وتوت مشكل — وكلها بدون سكر.` },
  { q: 'إيه العروض المتاحة؟', a: 'عرض 30 كانز بـ 600 جنيه بدل 725، وعرض 5 كانز + الكانز السادسة هدية بـ 125 جنيه بدل 150.' },
  { q: 'التوصيل مجاني ولا بفلوس؟', a: SHIPPING_ONCE_LABEL },
  { q: 'الشحن بيتكرر على كل باقة؟', a: 'لا، الشحن مرة واحدة بس على الطلب كله — ولو طلبك كله عروض بتوصيل مجاني مش هتدفع شحن خالص.' },
  { q: 'التوصيل بياخد قد إيه؟', a: 'فريق Healthy Cola بيتواصل سريعاً لتأكيد الطلب، والتوصيل يبدأ خلال ساعات بعد التأكيد. معظم الطلبات تصل في نفس اليوم حسب المنطقة.' },
  { q: 'هل Healthy Cola فيها سكر؟', a: 'لا، المنتج 0 سكر ومحلى بالاستيفيا بدل السكر التقليدي.' },
  { q: 'هل مناسبة لمرضى السكر والكيتو؟', a: 'نعم، لأنها 0 سعرات حرارية ومناسبة لمرضى السكر ونظام الكيتو دايت وأي نظام منخفض السعرات.' },
  { q: 'هل فيها أسبارتام؟', a: 'لا، Healthy Cola بدون أسبارتام تماماً.' },
  { q: 'أطلب إزاي؟', a: 'اختار العرض، أكمل بياناتك، وفريقنا هيتواصل معاك لتأكيد الطلب والتوصيل.' },
]

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

function OrderTotalBreakdown({ subtotal, shippingFee, total, originalTotal, saving, deferred, shippingText }) {
  const isFree = !deferred && (!shippingFee || shippingFee === 0)
  return (
    <div className="order-breakdown" aria-label="تفاصيل الإجمالي">
      <div className="order-breakdown-row">
        <span>الاوردر</span>
        <span>{subtotal} ج.م</span>
      </div>
            {shippingText ? (
              <div className="order-breakdown-row">
                <span>الشحن</span>
                <span>{shippingText}</span>
              </div>
            ) : null}
      <div className="order-breakdown-row order-breakdown-total">
        <span>{deferred ? 'الإجمالي المبدئي' : 'الإجمالي'}</span>
        <div className="order-breakdown-total-val">
          <strong>{total} ج.م</strong>
          {originalTotal > total && <s>{originalTotal} ج.م</s>}
        </div>
      </div>
      {saving > 0 && (
        <p className="order-breakdown-saving">وفرت {saving} ج.م</p>
      )}
      {deferred ? null : <p className="order-breakdown-note">{isFree ? 'التوصيل مجاني لطلبك 🎉' : SHIPPING_ONCE_LABEL}</p>}
      <DeliveryHighlight compact />
    </div>
  )
}

const COLA_FLAVOR_IMAGES = {
  'كولا': canCola,
  'أناناس': canPineapple,
  'ليمون نعناع': canLemonMint,
  'برتقال': canOrange,
  'تفاح أخضر': canGreenApple,
  'توت مشكل': canMixBerries,
}

const LOCAL_FLAVOR_BUNDLES = LOCAL_BUNDLES.map(b => ({ ...b, flavorImages: COLA_FLAVOR_IMAGES }))

// ─── FLAVOR PICKER COMPONENT ─────────────────────────────────────────────────

function distributeFlavors(options, total) {
  return Object.fromEntries(options.map((f, i) => [f.id, Math.floor(total / options.length) + (i < total % options.length ? 1 : 0)]))
}

function describeFlavors(bundle, counts) {
  return bundle.flavorOptions.filter(f => (counts[f.id] || 0) > 0).map(f => `${counts[f.id]} ${f.name}`).join(' + ')
}

function FlavorPicker({ units, qty, options, flavors, onChange, label }) {
  const total = units * qty
  const used = options.reduce((sum, f) => sum + (flavors[f.id] || 0), 0)
  const adjust = (id, delta) => {
    const next = Object.fromEntries(options.map(f => [f.id, flavors[f.id] || 0]))
    if (delta < 0 && next[id] === 0) return
    // With a complete distribution, transfer one bottle between visible flavors.
    if (delta > 0 && used >= total) {
      const donor = options.find(f => f.id !== id && next[f.id] > 0)
      if (!donor) return
      next[donor.id]--
    } else if (delta < 0 && used === total && options.length > 1) {
      next[options.find(f => f.id !== id).id]++
    }
    next[id] += delta
    onChange(next)
  }
  return <div className="flavor-section">
    <div className="flavor-header"><h3 className="flavor-title">{label}</h3><span className="flavor-badge">{total} كانز</span></div>
    {options.length === 0 ? <p role="alert">النكهات غير متاحة حاليًا — اختار عرض تاني.</p> : <>
      <p className="flavor-hint">اختار توزيع النكهات اللي يناسبك، والمجموع لازم يكون {total} كانز.</p>
      <div className="flavor-quick-picks">
        {options.map(f => <button key={f.id} type="button" className="fqp-btn" onClick={() => onChange(Object.fromEntries(options.map(x => [x.id, x.id === f.id ? total : 0])))}>كله {f.name}</button>)}
        {options.length > 1 && <button type="button" className="fqp-btn fqp-btn--recommended" onClick={() => onChange(distributeFlavors(options, total))}>{options.length === 2 ? '⚖️ نص نص' : '⚖️ توزيع بالتساوي'}</button>}
      </div>
      <div className="flavor-line">
        {options.map(f => <div key={f.id} className={`flavor-pill ${flavors[f.id] > 0 ? 'active-cola' : ''}`}>
          <span className="flavor-pill-info">
            {f.image ? <img src={f.image} alt={`كانز ${f.name}`} className="flavor-pill-img" loading="lazy" /> : <span className="flavor-pill-emoji">🥤</span>}
            <span className="flavor-pill-name">{f.name}</span>
          </span>
          <div className="flavor-counter">
            <button type="button" className="fctr-btn" aria-label={`زيادة ${f.name}`} onClick={() => adjust(f.id, 1)} disabled={flavors[f.id] >= total}>+</button>
            <span className="fctr-val">{flavors[f.id] || 0}</span>
            <button type="button" className="fctr-btn" aria-label={`تقليل ${f.name}`} onClick={() => adjust(f.id, -1)} disabled={!flavors[f.id] || options.length === 1}>−</button>
          </div>
        </div>)}
      </div>
      <p className="flavor-hint" role="status">{used === total ? 'تم توزيع كل الكانزات ✓' : `باقي ${total - used} كانز للتوزيع`}</p>
    </>}
  </div>
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
  // purchaseSubmitLock prevents re-entry during the async submit.
  // It is set to the eventId string (not just true) so we can detect
  // if a second call arrives with the same or a different eventId.
  const purchaseSubmitLock = useRef(false)
  const [touched, setTouched] = useState({})
  const [itemFlavors, setItemFlavors] = useState(() =>
    initialItems.map(item => distributeFlavors(item.bundle.flavorOptions, unitsPerBundle(item.bundle) * item.qty))
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
  const shippingFee = calcShipping(cartItems)
  const shipState = cartShipping(cartItems, 'cola')
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
      const summary = `${item.bundle.name} ×${item.qty} (${describeFlavors(item.bundle, itemFlavors[i])})`
      return summary
    }).join(' | ')

  const buildOfferSummary = () =>
    cartItems.map((item) => `${item.bundle.name} ×${item.qty}`).join(' | ')

  const handleSubmit = async () => {
    // Guard 1: status-based lock (catches re-renders and rapid taps after completion)
    if (status === 'sending' || status === 'done') return
    // Guard 2: ref-based lock (catches rapid double-taps before state update propagates)
    if (purchaseSubmitLock.current) return

    setTouched({ name: true, phone: true, gov: true, address: true })
    if (cartItems.some((item, i) => item.bundle.flavorsAvailable === false ||
      item.bundle.flavorOptions.reduce((sum, f) => sum + (itemFlavors[i][f.id] || 0), 0) !== unitsPerBundle(item.bundle) * item.qty)) return
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

    // Set lock BEFORE any async work — prevents all re-entry paths
    purchaseSubmitLock.current = true
    setStatus('sending')

    try {
      const orderSummary = buildOrderSummary()
      const offerSummary = buildOfferSummary()

      // buildPurchaseMeta resolves the session-scoped eventId, so a resubmit
      // carries the identical id and Meta deduplicates it automatically.
      const { eventName, eventTime, eventId, eventParams } = buildPurchaseMeta({
        value: totalPrice,
        contentName: offerSummary,
      })

      console.log('[Order] Purchase submit:', { event_id: eventId, value: eventParams.value, totalPrice })

      // ── CAPI (server-side) ────────────────────────────────────────────────
      // Only send to sheet + CAPI once per session. Apps Script has its own
      // capiAlreadySent() guard using CacheService; this is the first line of defence.
      if (!wasOrderPurchaseSent()) {
        sendServerEvent({
          name,
          phone,
          gov,
          address,
          notes: shippingOrderNote(notes, cartItems, 'cola'),
          bundle: offerSummary,
          subtotal: `${subtotal} ج.م`,
          shippingFee: cartShippingLabel(cartItems, 'cola'),
          price: `${totalPrice} ج.م`,
          value: String(totalPrice),          // plain number string — Apps Script parses with Number()
          quantity: String(cartItems.reduce((s, i) => s + i.qty, 0)),
          flavors: orderSummary,
          productWeight: PRODUCT_SIZES_LABEL,
          eventName,
          eventTime: String(eventTime),
          eventId,                            // same id sent to the browser pixel below
          contentName: offerSummary,
        })
      }

      // ── Browser Pixel ─────────────────────────────────────────────────────
      // trackBrowserEventOnce uses its own sessionStorage key per (eventName+eventId)
      // so it is safe to call even if wasOrderPurchaseSent() was already true.
      // The eventID option MUST match the event_id sent to CAPI above.
      trackBrowserEventOnce(eventName, eventParams, eventId)

      // Mark order as sent — blocks CAPI re-send on any future submit attempt
      markOrderPurchaseSent()

      window.history.pushState({}, '', '/confirmation_order')
      setStatus('done')
    } catch (err) {
      console.error('[Order] Submit error:', err)
      setStatus('done')
    }
    // NOTE: purchaseSubmitLock is intentionally NOT released in finally.
    // Once an order is submitted (success or error) the lock stays true
    // for the lifetime of this component instance, preventing any retry
    // from firing a second Purchase event. The status === 'done' guard
    // also catches this, but the lock is a belt-and-suspenders safety net.
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
              return (
                <div key={i}>
                  <div className="success-card-row">
                    <span className="success-label">{item.bundle.name}</span>
                    <span className="success-val">×{item.qty} — {item.bundle.price * item.qty} ج.م</span>
                  </div>
                  <div className="success-card-row">
                    <span className="success-label">النكهات</span>
                    <span className="success-val">{describeFlavors(item.bundle, itemFlavors[i])}</span>
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
            {!shipState.deferred && (
              <div className="success-card-row">
                <span className="success-label">الشحن (مرة واحدة)</span>
                <span className="success-val">{cartShippingLabel(cartItems, 'cola')}</span>
              </div>
            )}
            <div className="success-card-row">
              <span className="success-label">{shipState.deferred ? 'الإجمالي المبدئي' : 'الإجمالي'}</span>
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
              <img src={item.bundle.image || canCola} alt={`صورة ${item.bundle.name} في الطلب`} />
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
                {Boolean(shippingLabel(item.bundle, 'cola')) && <span className={`confirm-badge ${item.bundle.freeShipping ? 'green' : 'gray'}`}>{shippingLabel(item.bundle, 'cola')}</span>}
              </div>
            </div>
          </div>
          <FlavorPicker
            options={item.bundle.flavorOptions}
            units={unitsPerBundle(item.bundle)}
            qty={item.qty}
            flavors={itemFlavors[i]}
            label={`اختار توزيع نكهات الـ ${unitsPerBundle(item.bundle) * item.qty} كانز`}
            onChange={(f) => setItemFlavors(prev => prev.map((x, idx) => idx === i ? { ...x, ...f } : x))}
          />
        </div>
      ))}

      <OrderTotalBreakdown
        subtotal={subtotal}
        shippingFee={shippingFee}
        total={totalPrice}
        originalTotal={totalOriginal}
        saving={totalSaving}
        deferred={shipState.deferred}
        shippingText={cartShippingLabel(cartItems, 'cola')}
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

function Landing({ bundles, offersReady, onConfirm, initialCart = {} }) {
  const content = usePageContent()
  const [openFaq, setOpenFaq] = useState(null)
  const [cart, setCart] = useState(initialCart)
  // Prevents AddToCart from firing twice if both checkout buttons are tapped
  // rapidly, or if onConfirm is called before the flow state transitions.
  const checkoutLock = useRef(false)

  const cartCount = bundles.reduce((s, b) => s + (b.flavorsAvailable === false ? 0 : cart[b.id] || 0), 0)
  const cartItems = bundles
    .filter(b => b.flavorsAvailable !== false && (cart[b.id] || 0) > 0)
    .map(b => ({ bundle: b, qty: cart[b.id] }))
  const cartCheckoutTotal = calcOrderTotal(cartItems)

  const addToCart = (bundleId) => bundles.some(b => b.id === bundleId && b.flavorsAvailable !== false) && setCart(c => ({ ...c, [bundleId]: (c[bundleId] || 0) + 1 }))
  const setQty = (bundleId, val) => {
    if (!bundles.some(b => b.id === bundleId && b.flavorsAvailable !== false)) return
    if (val <= 0) {
      setCart(c => { const n = { ...c }; delete n[bundleId]; return n })
    } else {
      setCart(c => ({ ...c, [bundleId]: val }))
    }
  }

  const handleCheckout = () => {
    if (!offersReady) return
    if (checkoutLock.current) return
    const items = bundles
      .filter(b => b.flavorsAvailable !== false && (cart[b.id] || 0) > 0)
      .map(b => ({ bundle: b, qty: cart[b.id] }))
    if (items.length === 0) return
    checkoutLock.current = true
    onConfirm(items)
  }

  const scrollToBundles = () => document.getElementById('bundles-section')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className={`landing ${cartCount > 0 ? 'landing--has-cart' : 'landing--sticky-cta'}`}>

      {/* STICKY CART BAR */}
      {cartCount > 0 && (
        <div className="sticky-cart-bar">
          <div className="sticky-cart-items">
            {bundles.filter(b => b.flavorsAvailable !== false && (cart[b.id] || 0) > 0).map(b => (
              <span key={b.id} className="sticky-cart-chip" style={{ '--accent': b.accent }}>
                {b.name} ×{cart[b.id]}
              </span>
            ))}
          </div>
          <button className="sticky-cart-btn" disabled={!offersReady} onClick={handleCheckout}>
            {content.checkoutCta} — {cartCheckoutTotal} ج.م ←
          </button>
        </div>
      )}

      <header className="topbar">
        <img src={logo} alt="Healthy & Tasty" className="topbar-logo" />
        <button type="button" className="topbar-cta" onClick={scrollToBundles}>
          {content.headerCta}
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
            كانز 250 مل بـ 6 نكهات… من غير سكر، من غير سعرات، ومن غير ما تبوّظ نظامك
          </p>
          <DeliveryHighlight />
          <p className="hero-shipping-note">{shippingSummary(bundles, 'cola')}</p>
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
              <img src={canCola} alt={`كانز Healthy Cola بنكهة الكولا — ${CAN_SIZE}`} />
              <div className="bottle-label">كولا · {CAN_SIZE}</div>
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
              <img src={canLemonMint} alt={`كانز Healthy Cola ليمون نعناع — ${CAN_SIZE}`} />
              <div className="bottle-label lemon-label">
                <span className="bottle-label-line">ليمون نعناع · {CAN_SIZE}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flavors-strip-section" id="flavors-section" aria-label="نكهات Healthy Cola">
        <div className="flavors-strip">
          <span className="flavors-strip-label">6 نكهات:</span>
          {flavorShowcase.map((flavor) => (
            <span className="flavor-chip" key={flavor.name} style={{ '--flavor-accent': flavor.accent }}>
              <img src={flavor.image} alt={`كانز Healthy Cola ${flavor.name}`} loading="lazy" />
              {flavor.name}
            </span>
          ))}
        </div>
      </section>

      <section className="section dark-section" id="bundles-section">
        <div className="section-head light">
          <p className="eyebrow-pill light">اختار العرض المناسب لك 👇</p>
          <h2>الباقة المناسبة ليك</h2>
          <p>كل العروض والدفع عند الاستلام 💳 · {shippingSummary(bundles, 'cola')}</p>
          <DeliveryHighlight compact />
        </div>
        {!offersReady && <p role="status">جاري تحديث العروض…</p>}
        <div className="bundle-list">
          {bundles.map((bundle) => {
            const qty = bundle.flavorsAvailable === false ? 0 : cart[bundle.id] || 0
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
                aria-disabled={bundle.flavorsAvailable === false}
                data-offer-id={bundle.id}
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
                  <img src={bundle.image || canCola} alt={`صورة ${bundle.name} — Healthy Cola`} loading="lazy" />
                </div>
                <div className="bundle-row-info">
                  <h3>{bundle.name}</h3>
                  <p>{bundle.description}</p>
                  <p className="bundle-row-note">{bundle.flavorsAvailable === false ? 'النكهات غير متاحة حاليًا' : bundle.note}</p>
                  {Boolean(shippingLabel(bundle, 'cola')) && (
                    <p className={`delivery-tag ${bundle.freeShipping ? 'delivery-tag--free' : 'delivery-tag--paid'}`}>
                      {shippingLabel(bundle, 'cola')}
                    </p>
                  )}
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
                      <button disabled={bundle.flavorsAvailable === false} type="button" className="add-to-cart-btn" onClick={() => addToCart(bundle.id)}>
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
          <button type="button" className="next-btn landing-next-btn" disabled={!offersReady} onClick={handleCheckout}>
            {content.checkoutCta} ({cartCount} قطعة — {cartCheckoutTotal} ج.م) ←
          </button>
        )}
      </section>

      <section className="section" id="benefits-section">
        <div className="section-head">
          <p className="eyebrow-pill">ليه Healthy Cola؟</p>
          <h2>نفس إحساس الكولا… باختيار أذكى</h2>
          <p>كانز {CAN_SIZE} · {FLAVOR_COUNT_LABEL} — كولا، أناناس، ليمون نعناع، برتقال، تفاح أخضر، وتوت مشكل.</p>
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
              {openFaq === i && <p className="faq-a">{item.q === 'التوصيل مجاني ولا بفلوس؟' ? (() => { const parts = bundles.map(bundle => { const label = shippingLabel(bundle, 'cola'); return label ? `${bundle.name}: ${label}` : '' }).filter(Boolean); return parts.length ? parts.join(' · ') + ' — ' + SHIPPING_ONCE_LABEL : 'لا توجد رسوم شحن معلنة على العروض الحالية' })() : item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {cartCount === 0 && (
        <button type="button" className="sticky-cta" onClick={scrollToBundles}>
          {content.bottomCta}
        </button>
      )}

      <footer className="footer">
        <img src={logo} alt="شعار Healthy and Tasty" className="footer-logo" />
        <div className="footer-links">
          <a href={`tel:${content.phone}`}><Phone size={16} /> {content.phoneLabel}</a>
          <a href={`mailto:${content.email}`}><Mail size={16} /> {content.emailLabel}</a>
        </div>
      </footer>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function App() {
  const [flow, setFlow] = useState('landing')
  const { bundles, ready } = useOffers('cola', LOCAL_FLAVOR_BUNDLES)
  const [cartItems, setCartItems] = useState([])

  // One ViewContent per page load on both channels with a shared event_id.
  // The SPA swaps routes via pushState, so this deliberately does not re-fire
  // on flow changes.
  useEffect(() => {
    trackMetaEvent(
      'ViewContent',
      {
        content_name: PRODUCT_SIZES_LABEL,
        content_type: 'product',
        currency: 'EGP',
      },
      PRODUCT_SIZES_LABEL,
    )
  }, [])

  if (flow === 'landing') {
    return (
      <Landing
        bundles={bundles}
        offersReady={ready}
        onConfirm={(items) => {
          setCartItems(items)
          setFlow('form')
          window.scrollTo({ top: 0, behavior: 'instant' })
          window.history.pushState({}, '', '/add_to_cart')

          const contentName = items.map((item) => `${item.bundle.name} ×${item.qty}`).join(' | ')
          trackMetaEvent(
            'AddToCart',
            {
              value: calcOrderTotal(items),
              currency: 'EGP',
              content_name: contentName,
              content_type: 'product',
            },
            contentName,
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

export function LandingPreview({ showCart, focusSlug }) {
  const { bundles, ready } = useOffers('cola', LOCAL_FLAVOR_BUNDLES)
  const first = focusSlug ? bundles.find(bundle => bundle.id === focusSlug && bundle.flavorsAvailable !== false) : bundles.find(bundle => bundle.flavorsAvailable !== false)
  return <Landing key={first?.id || 'empty'} bundles={bundles} offersReady={ready} onConfirm={() => {}} initialCart={showCart && first ? { [first.id]: 1 } : {}} />
}
