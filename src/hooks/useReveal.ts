import { useEffect, useRef } from 'react';

export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; stagger?: boolean }
) {
  const ref = useRef<T | null>(null);
  const threshold = options?.threshold ?? 0.12;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    if (options?.stagger) {
      el.classList.add('reveal-stagger');
    } else {
      el.classList.add('reveal');
    }

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, options?.stagger]);

  return ref;
}
