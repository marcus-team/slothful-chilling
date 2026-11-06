import { useEffect } from 'react';

// Giữ màn hình sáng khi đang đọc (trình duyệt nào không hỗ trợ thì bỏ qua)
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const nav = navigator as any;
    if (!active || !nav.wakeLock) return;

    let lock: any = null;
    let cancelled = false;

    const request = async () => {
      try {
        const next = await nav.wakeLock.request('screen');
        if (cancelled) {
          next.release().catch(() => {});
          return;
        }
        lock = next;
      } catch {
        // bị từ chối (pin yếu, tab ẩn...) thì thôi
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch?.(() => {});
    };
  }, [active]);
}
