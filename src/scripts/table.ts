// Filterable, sortable reference table shared by the weapons and equipment
// pages. Everything page-specific is declared in markup:
//
//   <section data-ref-table data-noun="weapon" data-numeric="damage,weight,cost"
//            data-desc-first="damage,cost">
//     <… data-set="<filter key>" data-value="…">   filter buttons (aria-pressed)
//     <input data-filter-input>                      free-text filter
//     <select data-card-sort>                        sort control for the card layout
//     <button data-sort="<key>">                     sortable column header
//     <tbody data-rows><tr data-row data-order data-name data-search data-<key>…>
//     <… data-result-count>, <… data-empty>, <button data-reset>
//
// Numeric sort values that are empty (the SRD lists no weight or cost) sort
// last in both directions. Clicking a header cycles through its natural
// direction (descending first for keys in data-desc-first), the reverse, then
// back to SRD order, so every order is reachable from the header alone.

export function initRefTable(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-filter-input]');
  const tbody = root.querySelector<HTMLElement>('[data-rows]')!;
  const rows = [...tbody.querySelectorAll<HTMLTableRowElement>('[data-row]')];
  const count = root.querySelector<HTMLElement>('[data-result-count]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const cardSort = root.querySelector<HTMLSelectElement>('[data-card-sort]');
  const sortButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-sort]')];
  const setButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-set]')];
  const noun = root.dataset.noun ?? 'item';
  const descFirst = new Set((root.dataset.descFirst ?? '').split(',').filter(Boolean));
  const numericKeys = new Set((root.dataset.numeric ?? '').split(',').filter(Boolean));

  const keys = [...new Set(setButtons.map((b) => b.dataset.set!))];
  const state: Record<string, string> = Object.fromEntries(keys.map((k) => [k, '']));
  let sortKey = '';
  let sortDir: 'asc' | 'desc' = 'asc';

  const params = new URLSearchParams(location.search);
  for (const k of keys) state[k] = params.get(k) ?? '';
  if (input) input.value = params.get('q') ?? '';

  function applyFilters() {
    const terms = (input?.value ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const row of rows) {
      const d = row.dataset;
      const match = keys.every((k) => !state[k] || d[k] === state[k]) && terms.every((t) => d.search!.includes(t));
      row.hidden = !match;
      if (match) shown++;
    }
    for (const b of setButtons) b.setAttribute('aria-pressed', String(state[b.dataset.set!] === b.dataset.value));
    if (count) count.textContent = `${shown} ${noun}${shown === 1 ? '' : 's'}`;
    if (empty) empty.hidden = shown > 0;

    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(state)) if (v) next.set(k, v);
    if (input?.value.trim()) next.set('q', input.value.trim());
    const qs = next.toString();
    history.replaceState(history.state, '', qs ? `?${qs}` : location.pathname);
  }

  const toNumber = (v: string | undefined) => (v === undefined || v === '' ? null : Number(v));

  function compare(a: HTMLElement, b: HTMLElement) {
    if (!sortKey) return Number(a.dataset.order) - Number(b.dataset.order);
    const av = a.dataset[sortKey];
    const bv = b.dataset[sortKey];
    let cmp: number;
    if (numericKeys.has(sortKey)) {
      const an = toNumber(av);
      const bn = toNumber(bv);
      if (an === null || bn === null) {
        // Missing values go last regardless of direction.
        if (an !== bn) return an === null ? 1 : -1;
        cmp = 0;
      } else {
        cmp = an - bn;
      }
    } else {
      cmp = (av ?? '').localeCompare(bv ?? '');
    }
    return (sortDir === 'asc' ? cmp : -cmp) || a.dataset.name!.localeCompare(b.dataset.name!);
  }

  function applySort() {
    tbody.append(...[...rows].sort(compare));
    for (const btn of sortButtons) {
      const th = btn.closest('th')!;
      if (btn.dataset.sort === sortKey) th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    }
    if (cardSort) cardSort.value = sortKey ? `${sortKey}:${sortDir}` : '';
  }

  root.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-set]');
    if (btn && root.contains(btn)) {
      state[btn.dataset.set!] = btn.dataset.value ?? '';
      applyFilters();
    }
  });
  input?.addEventListener('input', applyFilters);

  for (const btn of sortButtons) {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort!;
      const first = descFirst.has(key) ? 'desc' : 'asc';
      if (sortKey !== key) {
        sortKey = key;
        sortDir = first;
      } else if (sortDir === first) {
        sortDir = first === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = '';
      }
      applySort();
    });
  }
  cardSort?.addEventListener('change', () => {
    const [key, dir] = cardSort.value.split(':');
    sortKey = key ?? '';
    sortDir = dir === 'desc' ? 'desc' : 'asc';
    applySort();
  });

  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    for (const k of keys) state[k] = '';
    if (input) input.value = '';
    applyFilters();
  });

  applyFilters();
}
