# Healthy Cola Landing Page

Landing page عربية لمنتج Healthy Cola (350 مل) مبنية بـ React وVite. الصفحة تعرض العروض، تجمع بيانات الطلب، تبعت الطلب إلى Google Sheets عن طريق Google Apps Script، وتدعم Meta Pixel + Conversions API لتتبع حدث الشراء من المتصفح والسيرفر.

## Features

- صفحة RTL عربية موجهة للموبايل والديسكتوب.
- عروض متعددة مع سلة بسيطة واختيار كمية كل عرض.
- اختيار توزيع النكهات لكل طلب.
- فورم بيانات العميل مع validation.
- إرسال الطلب إلى Google Sheets عبر Google Apps Script.
- Meta Pixel browser event باسم `Purchase`.
- Meta Conversions API server event عبر Google Apps Script بنفس `event_id` لمطابقة Browser and Server.

## Tech Stack

- React
- Vite
- Lucide React icons
- Google Apps Script
- Meta Pixel / Meta Graph API

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

ملفات الرفع النهائية بتكون داخل:

```txt
dist/
```

المشروع Frontend فقط، لذلك رفع `dist` على استضافة static سيشغل الصفحة والـ Pixel. أما CAPI فتعمل من خلال Google Apps Script المنشور، وليس من الاستضافة نفسها.

## Order Flow

1. العميل يختار الأوفر والكمية والنكهات.
2. عند تأكيد الطلب، المتصفح يرسل Meta Pixel event:

```js
fbq('track', 'Purchase', eventParams, { eventID: eventId })
```

3. نفس الطلب يتبعت إلى Google Apps Script.
4. Google Apps Script يسجل الطلب في Google Sheets.
5. Google Apps Script يرسل Server Event إلى Meta Conversions API بنفس:

```txt
event_name
event_time
action_source
event_id
```

بهذا يظهر الحدث في Meta Test Events كـ `Received From: Browser and Server` عند ضبط السكريبت والتوكن بشكل صحيح.

## Google Apps Script Setup

انسخ محتوى الملف:

```txt
google-apps-script.js
```

إلى Google Apps Script المرتبط بالشيت، ثم عدل القيم التالية:

```js
var FB_PIXEL_ID = '2267627306980280';
var FB_ACCESS_TOKEN = 'PASTE_META_CAPI_ACCESS_TOKEN_HERE';
var FB_TEST_EVENT_CODE = '';
```

أثناء الاختبار، ضع Test Event Code من Meta في:

```js
var FB_TEST_EVENT_CODE = 'TEST_CODE_FROM_META';
```

بعد التعديل اعمل Deploy كـ Web App:

- Execute as: Me
- Who has access: Anyone

ثم استخدم رابط الـ Web App داخل `ORDER_API_URL` في:

```txt
src/App.jsx
```

## Sheet Columns

السكريبت يكتب الأعمدة التالية:

- Date and time
- Name
- Phone
- Governorate
- Address
- Notes
- Bundle
- Flavors
- Quantity
- Price
- Product Weight (اختياري — القيمة الافتراضية `350 مل`)

عمود `Bundle` يستقبل اسم الأوفر والكمية فقط، مثل:

```txt
عرض الكومبو ×1
```

عمود `Flavors` يستقبل تفاصيل النكهات، مثل:

```txt
عرض الكومبو ×1 (6 كولا + 6 ليمون) + هدية (3 كولا + 3 ليمون)
```

## Verification

```bash
npx eslint src\App.jsx
npm run build
```

ملاحظة: `npm run lint` الكامل قد يظهر أخطاء على ملف Google Apps Script لأن ESLint المحلي لا يعرف globals الخاصة بجوجل مثل `SpreadsheetApp` و`UrlFetchApp`.

## Deployment Notes

- لو الاستضافة static فقط، ارفع محتويات `dist`.
- تأكد أن Google Apps Script منشور ومتاح لأي شخص.
- لا تضع Meta access token داخل كود React أو أي ملف يتم رفعه للمتصفح.
- بعد أي تعديل على Google Apps Script، اعمل Deploy new version.
