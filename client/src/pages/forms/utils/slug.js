export function generateSlug(title, existingSlugs = []) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled-form';

  let slug = base;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export function isDuplicateName(title, forms, excludeId = null) {
  const normalized = title.trim().toLowerCase();
  return forms.some((form) =>
    form.id !== excludeId && form.title.trim().toLowerCase() === normalized
  );
}
