// Bundle components keep their own flavor choices. Values are keyed by
// component.key and each entry is the list of chosen flavor ids.
export function componentIsAuto(component) {
  const options = component?.flavorOptions || [];
  return Boolean(component?.choose) && options.length > 0 && options.length === component.choose;
}

export function autoBundleValues(components = []) {
  return Object.fromEntries(components.map((component) => {
    if (!component.choose) return [component.key, []];
    const options = component.flavorOptions || [];
    if (options.length > 0 && options.length === component.choose) {
      return [component.key, options.slice(0, component.choose).map((option) => option.id)];
    }
    return [component.key, []];
  }));
}

export function emptyBundleValues(components = []) {
  return autoBundleValues(components);
}

export function normalizeBundleValues(components = [], saved) {
  const source = saved && typeof saved === 'object' ? saved : {};
  return Object.fromEntries(components.map((component) => {
    if (!component.choose) return [component.key, []];
    const options = component.flavorOptions || [];
    if (options.length > 0 && options.length === component.choose) {
      return [component.key, options.slice(0, component.choose).map((option) => option.id)];
    }
    const valid = new Set(options.map((option) => option.id));
    const picked = Array.isArray(source[component.key])
      ? source[component.key].filter((id) => valid.has(id))
      : [];
    return [component.key, [...new Set(picked)].slice(0, component.choose)];
  }));
}

export function bundleValuesComplete(components = [], values) {
  if (!values || typeof values !== 'object') return false;
  return components.every((component) => (
    component.choose === 0 ||
    componentIsAuto(component) ||
    (Array.isArray(values[component.key]) && values[component.key].length === component.choose)
  ));
}

export function describeBundleValues(components = [], values) {
  return components
    .map((component) => {
      const options = component.flavorOptions || [];
      const picked = componentIsAuto(component)
        ? options.slice(0, component.choose).map((option) => option.id)
        : values?.[component.key] || [];
      const names = picked
        .map((id) => options.find((option) => option.id === id)?.name)
        .filter(Boolean);
      const qtySuffix = component.qty > 1 ? ` ×${component.qty}` : '';
      if (!component.choose) return `${component.label}${qtySuffix}`;
      if (names.length === 0) return `${component.label}${qtySuffix}`;
      if (names.length === 1) {
        const sameName = names[0].trim() === String(component.label).trim();
        return sameName
          ? `${component.label}${qtySuffix}`
          : `${component.label}: ${names[0]}${qtySuffix}`;
      }
      return `${component.label}: ${names.join(' + ')}`;
    })
    .filter(Boolean)
    .join(' | ');
}
