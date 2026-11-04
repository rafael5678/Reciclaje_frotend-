import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../services/motion";

export function useCountUp(target: number, active = true, duration = 1100): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (prefersReducedMotion() || target === 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return value;
}
