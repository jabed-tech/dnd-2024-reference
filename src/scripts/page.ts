// Page lifecycle under Astro's ClientRouter. Bundled scripts run once per
// session, but pages are swapped in without a reload, so per-page setup has to
// run on every `astro:page-load` (which also fires on the first load). Anything
// a page registers on `document` or `window` is tied to the signal, which is
// aborted just before the next page is swapped in, so listeners never stack up.

export function onPage(init: (signal: AbortSignal) => void) {
  document.addEventListener('astro:page-load', () => {
    const controller = new AbortController();
    document.addEventListener('astro:before-swap', () => controller.abort(), { once: true });
    try {
      init(controller.signal);
    } catch (err) {
      console.error(err);
    }
  });
}
