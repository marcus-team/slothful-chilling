import { useEffect, useState, useRef, useCallback } from 'react';

interface UseOverscrollOptions {
  onNext?: () => void;
  onPrev?: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  threshold?: number; // pixels of overscroll required, e.g. 70
}

export function useOverscrollNavigation({
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  threshold = 75,
}: UseOverscrollOptions) {
  const [overscrollBottom, setOverscrollBottom] = useState(0);
  const [overscrollTop, setOverscrollTop] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const cooldownRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearDecay = () => {
    if (decayTimerRef.current) {
      clearTimeout(decayTimerRef.current);
      decayTimerRef.current = null;
    }
  };

  const triggerNext = useCallback(() => {
    if (cooldownRef.current || !hasNext || !onNext) return;
    cooldownRef.current = true;
    setIsNavigating(true);
    setOverscrollBottom(threshold);

    setTimeout(() => {
      onNext();
      setOverscrollBottom(0);
      setIsNavigating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        cooldownRef.current = false;
      }, 700);
    }, 350);
  }, [hasNext, onNext, threshold]);

  const triggerPrev = useCallback(() => {
    if (cooldownRef.current || !hasPrev || !onPrev) return;
    cooldownRef.current = true;
    setIsNavigating(true);
    setOverscrollTop(threshold);

    setTimeout(() => {
      onPrev();
      setOverscrollTop(0);
      setIsNavigating(false);
      // When going to previous chapter, scroll to bottom or top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        cooldownRef.current = false;
      }, 700);
    }, 350);
  }, [hasPrev, onPrev, threshold]);

  useEffect(() => {
    // Wheel event handler (Desktop trackpad / mouse wheel)
    const handleWheel = (e: WheelEvent) => {
      if (cooldownRef.current || isNavigating) return;

      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const isAtBottom = scrollY + windowHeight >= docHeight - 8;
      const isAtTop = scrollY <= 2;

      // Bottom overscroll (scrolling down further)
      if (isAtBottom && e.deltaY > 0 && hasNext) {
        setOverscrollBottom((prev) => {
          const nextVal = Math.min(threshold, prev + Math.abs(e.deltaY) * 0.45);
          if (nextVal >= threshold) {
            triggerNext();
            return threshold;
          }
          return nextVal;
        });

        clearDecay();
        decayTimerRef.current = setTimeout(() => {
          setOverscrollBottom(0);
        }, 300);
      }

      // Top overscroll (scrolling up further)
      if (isAtTop && e.deltaY < 0 && hasPrev) {
        setOverscrollTop((prev) => {
          const nextVal = Math.min(threshold, prev + Math.abs(e.deltaY) * 0.45);
          if (nextVal >= threshold) {
            triggerPrev();
            return threshold;
          }
          return nextVal;
        });

        clearDecay();
        decayTimerRef.current = setTimeout(() => {
          setOverscrollTop(0);
        }, 300);
      }
    };

    // Touch event handlers (Mobile / Tablet swipe overscroll)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current === null || cooldownRef.current || isNavigating) return;

      const currentY = e.touches[0].clientY;
      const deltaY = touchStartYRef.current - currentY; // positive = dragging up (scrolling down)

      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const isAtBottom = scrollY + windowHeight >= docHeight - 8;
      const isAtTop = scrollY <= 2;

      if (isAtBottom && deltaY > 15 && hasNext) {
        const pullAmount = Math.min(threshold, deltaY * 0.6);
        setOverscrollBottom(pullAmount);
      } else if (isAtTop && deltaY < -15 && hasPrev) {
        const pullAmount = Math.min(threshold, Math.abs(deltaY) * 0.6);
        setOverscrollTop(pullAmount);
      }
    };

    const handleTouchEnd = () => {
      if (overscrollBottom >= threshold * 0.85 && hasNext) {
        triggerNext();
      } else {
        setOverscrollBottom(0);
      }

      if (overscrollTop >= threshold * 0.85 && hasPrev) {
        triggerPrev();
      } else {
        setOverscrollTop(0);
      }

      touchStartYRef.current = null;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      clearDecay();
    };
  }, [hasNext, hasPrev, threshold, isNavigating, triggerNext, triggerPrev, overscrollBottom, overscrollTop]);

  return {
    overscrollBottom,
    overscrollTop,
    bottomProgress: Math.min(1, overscrollBottom / threshold),
    topProgress: Math.min(1, overscrollTop / threshold),
    isNavigating,
  };
}
