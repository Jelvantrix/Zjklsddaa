let lockCount = 0;
let previousOverflow = '';
let previousPosition = '';
let previousTop = '';
let previousWidth = '';
let scrollY = 0;

export function lockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  lockCount++;
  if (lockCount === 1) {
    scrollY = window.scrollY;
    previousOverflow = document.body.style.overflow;
    previousPosition = document.body.style.position;
    previousTop = document.body.style.top;
    previousWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    // iOS Safari elastic scroll lock
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
  }
}

export function unlockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.position = previousPosition;
    document.body.style.top = previousTop;
    document.body.style.width = previousWidth;
    window.scrollTo(0, scrollY);
  }
}

export function forceUnlockBodyScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  lockCount = 0;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
}
