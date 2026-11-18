// One small, fast "settle" used whenever content changes in place (a filter, a
// swapped list): the new state fades and lifts 4px into place in 170ms. It runs
// on the compositor (opacity/transform) and is skipped for reduced motion.

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export function settle(el: Element | null) {
  if (!el || reduced.matches || !('animate' in el)) return;
  el.animate(
    [
      { opacity: 0.35, transform: 'translateY(4px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 170, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  );
}
