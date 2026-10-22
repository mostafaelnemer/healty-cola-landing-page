import { componentIsAuto } from './bundleSelection.js';
import './BundleComponents.css';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabic = (value) => String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[digit]);

export default function BundleComponents({ components = [], values = {}, onChange, title = 'اختار مكوّنات الباندل' }) {
  const update = (component, ids) => onChange({ ...values, [component.key]: ids });

  const toggle = (component, option) => {
    const current = values[component.key] || [];
    if (component.choose === 1) {
      update(component, [option.id]);
      return;
    }
    if (current.includes(option.id)) {
      update(component, current.filter((id) => id !== option.id));
      return;
    }
    if (current.length >= component.choose) return;
    update(component, [...current, option.id]);
  };

  return (
    <div className="bc-panel">
      {title && <p className="bc-title">{title}</p>}
      {components.map((component) => {
        const options = component.flavorOptions || [];
        const auto = componentIsAuto(component);
        const picked = auto
          ? options.slice(0, component.choose).map((option) => option.id)
          : values[component.key] || [];
        const done = component.choose === 0 || picked.length === component.choose;
        return (
          <section className={`bc-component${done ? ' bc-component--done' : ''}`} key={component.key}>
            <header className="bc-head">
              <strong>{component.label}</strong>
              <span className="bc-count">×{toArabic(component.qty)}</span>
              <span className={`bc-status${done ? ' is-done' : ''}`}>
                {component.choose === 0
                  ? 'ثابت — من غير اختيار'
                  : auto
                    ? 'تلقائي ✓'
                    : done
                      ? 'تم الاختيار ✓'
                      : `اختار ${toArabic(component.choose - picked.length)} من ${toArabic(component.choose)}`}
              </span>
            </header>
            {component.choose === 0 ? (
              <p className="bc-fixed">المكوّن ده جزء ثابت من الباندل.</p>
            ) : options.length === 0 ? (
              <p className="bc-empty" role="status">مفيش نكهات متاحة للمكوّن ده حاليًا.</p>
            ) : (
              <div className="bc-options" role="group" aria-label={`نكهات ${component.label}`}>
                {options.map((option) => {
                  const selected = picked.includes(option.id);
                  const disabled = auto || (!selected && picked.length >= component.choose && component.choose > 1);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`bc-option${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      aria-disabled={auto || disabled}
                      disabled={disabled}
                      onClick={() => toggle(component, option)}
                    >
                      {option.image
                        ? <img src={option.image} alt="" loading="lazy" decoding="async" />
                        : <span className="bc-option-dot" aria-hidden="true" />}
                      <span>{option.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
