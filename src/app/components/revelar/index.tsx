"use client";

import { CSSProperties, ElementType, ReactNode, useEffect, useRef } from "react";

// Un solo observador para toda la página: cada bloque aparece una vez al entrar en pantalla
let observador: IntersectionObserver | null = null;

const obtener = () =>
  (observador ??= new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observador?.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  ));

export default function Revelar({
  children,
  as: Tag = "div",
  retraso = 0,
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  retraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = obtener();
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);

  return (
    <Tag ref={ref} className={`revelar ${className}`} style={{ "--retraso": `${retraso}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}
