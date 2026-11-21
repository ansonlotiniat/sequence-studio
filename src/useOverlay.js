import { useEffect, useState } from 'react';

export function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

// Only modal surfaces trap focus. A docked desktop tutor stays usable alongside
// the experiment, while still supporting Escape and returning to its opener.
export function useOverlay(ref, open, modal, onClose) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const node = ref.current;
    const focusable = () => [...node.querySelectorAll('a[href],button,input,textarea,select,[tabindex="0"]')]
      .filter(element => !element.disabled && element.getClientRects().length);
    const frame = requestAnimationFrame(() => (focusable()[0] ?? node).focus());
    const previousOverflow = document.body.style.overflow;
    if (modal) document.body.style.overflow = 'hidden';
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (modal && event.key === 'Tab') {
        const items = focusable();
        const first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); node.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown);
      if (modal) document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, modal, onClose, ref]);
}
