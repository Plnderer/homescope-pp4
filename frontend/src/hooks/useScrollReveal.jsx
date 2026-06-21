import { useEffect, useRef } from "react";

export function useScrollReveal(options = { threshold: 0.15 }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add("reveal-visible");
        observer.unobserve(element);
      }
    }, options);

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options.threshold]);

  return ref;
}

export function Reveal({ children, className = "", delay = "", as: Component = "div", ...props }) {
  const ref = useScrollReveal();
  const delayClass = delay ? `reveal-delay-${delay}` : "";
  return (
    <Component ref={ref} className={`reveal-up ${delayClass} ${className}`} {...props}>
      {children}
    </Component>
  );
}
