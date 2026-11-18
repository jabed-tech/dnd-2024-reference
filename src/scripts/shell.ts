import { navigate } from 'astro:transitions/client';
import type { SearchDoc } from '../pages/search-index.json';
import { escapeHtml, highlight, search } from './search';
import { getFavourites, getRecent, getTheme, loadIndex, pushRecent, setSidebar, setTheme, toggleFavourite } from './store';

const KIND_LABEL: Record<SearchDoc['kind'], string> = {
  rule: 'Rule',
  weapon: 'Weapon',
  mastery: 'Mastery',
  property: 'Property',
  equipment: 'Equipment',
};

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function initTheme() {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');

  const sync = () => {
    const resolved = getTheme() ?? (media.matches ? 'dark' : 'light');
    root.dataset.resolvedTheme = resolved;
    button?.setAttribute('aria-label', resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  };

  button?.addEventListener('click', () => {
    const next = root.dataset.resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    root.dataset.theme = next;
    sync();
  });
  media.addEventListener('change', sync);
  sync();
}

// ---------------------------------------------------------------------------
// Sidebar collapse (desktop): full sidebar <-> icon rail, remembered per device
// ---------------------------------------------------------------------------

function initSidebar() {
  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>('[data-sidebar-toggle]');
  if (!button) return;

  const sync = () => {
    const collapsed = root.dataset.sidebar === 'collapsed';
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    button.title = `${collapsed ? 'Expand' : 'Collapse'} sidebar ([)`;
    // In the icon rail the names are visually hidden, so show them on hover.
    for (const a of document.querySelectorAll<HTMLAnchorElement>('.sidebar .nav-link')) {
      if (collapsed) a.title = a.querySelector('.nav-label')?.textContent?.trim() ?? '';
      else a.removeAttribute('title');
    }
  };

  const toggle = () => {
    const collapsed = root.dataset.sidebar !== 'collapsed';
    if (collapsed) root.dataset.sidebar = 'collapsed';
    else delete root.dataset.sidebar;
    setSidebar(collapsed ? 'collapsed' : 'expanded');
    sync();
  };

  button.addEventListener('click', toggle);
  // "[" toggles the sidebar, as in many docs sites and editors.
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if (e.key === '[' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) toggle();
  });
  document.addEventListener('astro:after-swap', sync);
  sync();
}

// ---------------------------------------------------------------------------
// Search palette
// ---------------------------------------------------------------------------

function initPalette() {
  const dialog = document.querySelector<HTMLDialogElement>('#search-palette');
  if (!dialog) return;
  const input = dialog.querySelector<HTMLInputElement>('#palette-input')!;
  const list = dialog.querySelector<HTMLUListElement>('#palette-results')!;
  const status = dialog.querySelector<HTMLElement>('#palette-status')!;
  const count = dialog.querySelector<HTMLElement>('[data-palette-count]')!;
  const kindButtons = [...dialog.querySelectorAll<HTMLButtonElement>('[data-kind]')].filter((b) => b.tagName === 'BUTTON');
  const icons = dialog.querySelector<HTMLTemplateElement>('#kind-icons')!.content;

  let docs: SearchDoc[] = [];
  let results: SearchDoc[] = [];
  let active = 0;
  let kind = '';
  let loadFailed = false;

  const iconFor = (k: string) => icons.querySelector(`[data-kind="${k}"]`)?.innerHTML ?? '';

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const hints = () =>
    document.querySelectorAll('[data-shortcut-hint]').forEach((el) => (el.textContent = isMac ? '⌘ K' : 'Ctrl K'));
  document.addEventListener('astro:after-swap', hints);
  hints();

  function setActive(i: number) {
    const items = list.querySelectorAll<HTMLLIElement>('[role="option"]');
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((el, idx) => el.setAttribute('aria-selected', String(idx === active)));
    const current = items[active];
    input.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({ block: 'nearest' });
  }

  // One persistent live region, outside the listbox, carries every state message:
  // a listbox may only contain options, and a region that is removed or hidden
  // while it updates is never announced.
  function setStatus(text: string, visible: boolean) {
    status.textContent = text;
    status.classList.toggle('visually-hidden', !visible);
  }

  function render() {
    const query = input.value;
    const recentMode = !query.trim();
    if (!docs.length && loadFailed) {
      results = [];
    } else if (recentMode) {
      const byId = new Map(docs.map((d) => [d.id, d]));
      results = getRecent()
        .map((id) => byId.get(id))
        .filter((d): d is SearchDoc => !!d && (!kind || d.kind === kind));
    } else {
      results = search(docs, query, kind);
    }

    list.innerHTML = results
      .map(
        (d, i) => `<li class="palette-result" role="option" id="result-${i}" aria-selected="false" data-index="${i}">
          <span class="kind-icon" aria-hidden="true">${iconFor(recentMode ? 'recent' : d.kind)}</span>
          <span class="r-title">${highlight(d.title, query)}</span>
          <span class="r-summary">${escapeHtml(d.summary)}</span>
          <span class="badge" data-kind="${d.kind}">${escapeHtml(d.kind === 'rule' ? d.label : KIND_LABEL[d.kind])}</span>
        </li>`,
      )
      .join('');
    list.hidden = !results.length;

    if (!docs.length && loadFailed) {
      setStatus('Search is unavailable offline until the site has been loaded once with a connection.', true);
    } else if (recentMode) {
      setStatus(results.length ? 'Recently viewed' : 'Start typing to search every rule, weapon, mastery, property and item.', true);
    } else if (results.length) {
      setStatus(`${results.length} result${results.length === 1 ? '' : 's'}`, false);
    } else {
      setStatus(`No results for “${query}”`, true);
    }
    // The badge repeats what `status` announces, so it stays out of the a11y tree.
    count.textContent = recentMode || !results.length ? '' : String(results.length);
    if (results.length) setActive(0);
    else input.removeAttribute('aria-activedescendant');
  }

  function go(url: string) {
    dialog!.close();
    void navigate(url);
  }

  async function open() {
    if (dialog!.open) return;
    dialog!.showModal();
    input.select();
    try {
      docs = await loadIndex();
      loadFailed = false;
    } catch {
      loadFailed = true;
    }
    render();
  }

  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-open-search]')) open();
    if ((e.target as Element).closest('[data-close-search]')) dialog.close();
  });

  // Close when clicking the backdrop.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      dialog.open ? dialog.close() : open();
    } else if (e.key === '/' && !typing && !dialog.open) {
      e.preventDefault();
      open();
    }
  });

  // Options are not links (a link inside role=option is nested-interactive), so navigate on click.
  list.addEventListener('click', (e) => {
    const option = (e.target as Element).closest<HTMLElement>('[role="option"]');
    const doc = option && results[Number(option.dataset.index)];
    if (doc) go(doc.url);
  });

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Escape') {
      // type="search" would otherwise swallow the first Escape to clear itself.
      e.preventDefault();
      dialog.close();
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active].url);
    }
  });

  kindButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      kind = btn.dataset.kind ?? '';
      kindButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
      input.focus();
    }),
  );
}

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------

function syncFavButtons() {
  const favs = new Set(getFavourites());
  document.querySelectorAll<HTMLButtonElement>('[data-fav]').forEach((btn) => {
    const on = favs.has(btn.dataset.fav!);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${btn.dataset.favName ?? 'entry'} ${on ? 'from' : 'to'} favourites`);
  });
}

function initFavourites() {
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    const on = toggleFavourite(btn.dataset.fav!);
    // The pop plays on a real click only, never when stars sync on page load.
    if (on) {
      btn.classList.remove('is-popping');
      void btn.offsetWidth;
      btn.classList.add('is-popping');
      btn.addEventListener('animationend', () => btn.classList.remove('is-popping'), { once: true });
    }
  });
  document.addEventListener('favourites-change', syncFavButtons);
  const perPage = () => {
    syncFavButtons();
    const docId = document.querySelector<HTMLElement>('[data-doc-id]')?.dataset.docId;
    if (docId) pushRecent(docId);
  };
  // Runs before the page's own scripts, so "Recently viewed" panels see it.
  document.addEventListener('astro:after-swap', perPage);
  perPage();
}

// ---------------------------------------------------------------------------
// Term tooltips
// ---------------------------------------------------------------------------

function initTooltips() {
  const tip = document.querySelector<HTMLElement>('#term-tip');
  if (!tip || !('showPopover' in tip)) return;

  let showTimer: number | undefined;
  let hideTimer: number | undefined;
  let anchor: HTMLAnchorElement | null = null;
  // The link whose preview was opened by a tap; a second tap on it navigates.
  let tappedAnchor: HTMLAnchorElement | null = null;
  // Touch browsers focus a link on pointerdown, before its click, so focus-driven
  // previews must ignore focus that a touch caused.
  let lastPointer = '';
  document.addEventListener('pointerdown', (e) => (lastPointer = e.pointerType), { capture: true });
  document.addEventListener('keydown', () => (lastPointer = ''), { capture: true });

  function place(link: HTMLElement) {
    const r = link.getBoundingClientRect();
    const t = tip!.getBoundingClientRect();
    const margin = 8;
    let top = r.bottom + margin;
    if (top + t.height > innerHeight - margin && r.top - t.height - margin > margin) top = r.top - t.height - margin;
    const left = Math.min(Math.max(margin, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - margin);
    tip!.style.top = `${top}px`;
    tip!.style.left = `${left}px`;
  }

  /** Shows the preview; resolves false when there is nothing to preview. */
  async function show(link: HTMLAnchorElement, withLink: boolean): Promise<boolean> {
    let docs: SearchDoc[];
    try {
      docs = await loadIndex();
    } catch {
      return false;
    }
    const doc = docs.find((d) => d.id === link.dataset.term);
    if (!doc) return false;
    anchor = link;
    tappedAnchor = withLink ? link : null;
    tip!.innerHTML = `<div class="tip-title">${escapeHtml(doc.title)}</div>
      <div class="tip-kind" data-kind="${doc.kind}">${escapeHtml(doc.kind === 'rule' ? doc.label : KIND_LABEL[doc.kind])}</div>
      <div class="tip-summary">${escapeHtml(doc.summary)}</div>
      ${withLink ? `<a class="tip-open" href="${doc.url}">Open ${escapeHtml(doc.title)}<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></a>` : ''}`;
    link.setAttribute('aria-describedby', 'term-tip');
    if (!tip!.matches(':popover-open')) tip!.showPopover();
    place(link);
    return true;
  }

  function hide() {
    if (tip!.matches(':popover-open')) tip!.hidePopover();
    anchor?.removeAttribute('aria-describedby');
    anchor = null;
    tappedAnchor = null;
  }

  const termFrom = (e: Event) => (e.target as Element).closest?.<HTMLAnchorElement>('a.term') ?? null;

  document.addEventListener('pointerover', (e) => {
    const link = termFrom(e);
    if (e.pointerType !== 'mouse') return;
    if (link) {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      showTimer = window.setTimeout(() => show(link, false), 220);
    } else if ((e.target as Element).closest('#term-tip')) {
      clearTimeout(hideTimer);
    }
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (termFrom(e) || (e.target as Element).closest('#term-tip')) {
      clearTimeout(showTimer);
      hideTimer = window.setTimeout(hide, 150);
    }
  });
  document.addEventListener('focusin', (e) => {
    const link = termFrom(e);
    if (link) {
      if (lastPointer === 'mouse' || lastPointer === '') show(link, false);
    } else if (!(e.target as Element).closest('#term-tip')) hide();
  });

  // Touch: the first tap previews and the "Open" link inside the tip (or a
  // second tap on the same term) navigates. When there is nothing to preview
  // (index offline, term missing) the tap falls through to the link.
  document.addEventListener('click', (e) => {
    const link = termFrom(e);
    const pointer = (e as PointerEvent).pointerType || lastPointer;
    if (link && pointer && pointer !== 'mouse' && tappedAnchor !== link) {
      e.preventDefault();
      e.stopPropagation();
      show(link, true).then((shown) => {
        if (!shown) void navigate(link.href);
      });
    } else if (!link && !(e.target as Element).closest('#term-tip')) {
      hide();
    }
    // Capture phase: this must run before the page router, which would
    // otherwise follow the link before the preview can cancel it.
  }, { capture: true });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
  addEventListener('scroll', hide, { passive: true });
  document.addEventListener('astro:before-preparation', hide);
}

// ---------------------------------------------------------------------------
// Back button
// ---------------------------------------------------------------------------

function initBackButtons() {
  let cameFromSite = false;
  try {
    cameFromSite = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1;
  } catch {
    /* malformed referrer */
  }
  const wire = () => {
    document.querySelectorAll<HTMLAnchorElement>('[data-back]').forEach((btn) => {
      if (!cameFromSite) return;
      btn.querySelector('[data-back-label]')!.textContent = 'Back';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        history.back();
      });
    });
  };
  // Any in-app navigation means there is a page of ours to go back to.
  document.addEventListener('astro:after-swap', () => {
    cameFromSite = true;
    wire();
  });
  wire();
}

// ---------------------------------------------------------------------------

function registerServiceWorker() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    addEventListener('load', () => {
      navigator.serviceWorker.register(`${document.body.dataset.base}sw.js`).catch(() => {});
    });
  }
}

export function initShell() {
  // Each feature is independent; one failing must not take the others down.
  for (const init of [initTheme, initSidebar, initPalette, initFavourites, initTooltips, initBackButtons, registerServiceWorker]) {
    try {
      init();
    } catch (err) {
      console.error(err);
    }
  }
}
