// Giọng đọc Azure (HoaiMy, NamMinh) qua hàm /api/tts trên Vercel.
// Âm thanh đã tạo được lưu trong máy: nghe lại đoạn cũ không tốn thêm hạn mức.
import { auth } from './firebase';

export const AZURE_PREFIX = 'azure:';
export const AZURE_VOICES = [
  { id: 'vi-VN-HoaiMyNeural', label: 'HoaiMy (nữ)' },
  { id: 'vi-VN-NamMinhNeural', label: 'NamMinh (nam)' },
];
export const AZURE_MONTHLY_LIMIT = 500_000; // hạn mức miễn phí của Azure (gói F0)

const CACHE_NAME = 'slothful-tts-v1';
const CACHE_MAX_ENTRIES = 400;
const USAGE_KEY = 'slothful_tts_azure_usage';

export class AzureTtsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ---- Ước lượng số ký tự đã dùng trong tháng (chỉ đếm lần phải gọi Azure) ----
const monthKey = () => new Date().toISOString().slice(0, 7);

export function getAzureUsage(): number {
  try {
    const saved = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
    return saved.month === monthKey() ? Number(saved.chars) || 0 : 0;
  } catch {
    return 0;
  }
}

function addAzureUsage(chars: number) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify({ month: monthKey(), chars: getAzureUsage() + chars }));
  } catch {}
}

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36) + s.length.toString(36);
};

const inflight = new Map<string, Promise<Blob>>();

async function fetchAudio(text: string, voice: string): Promise<Blob> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new AzureTtsError('auth', 'Cần đăng nhập lại.');

  let res: Response;
  try {
    res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, voice }),
    });
  } catch {
    throw new AzureTtsError('network', 'Không kết nối được mạng.');
  }
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new AzureTtsError(info.error || `http-${res.status}`, info.message || `Lỗi ${res.status}`);
  }
  return res.blob();
}

// Trả về mp3 của đoạn chữ (lấy từ máy nếu đã có)
export function getAzureAudio(text: string, voice: string): Promise<Blob> {
  const key = `https://tts.local/${voice}/${hash(text)}`;
  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    let cache: Cache | null = null;
    try {
      cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(key);
      if (hit) return await hit.blob();
    } catch {
      cache = null;
    }

    if (getAzureUsage() + text.length > AZURE_MONTHLY_LIMIT) {
      throw new AzureTtsError('quota', 'Đã hết hạn mức miễn phí của tháng này.');
    }
    const blob = await fetchAudio(text, voice);
    addAzureUsage(text.length);

    if (cache) {
      try {
        await cache.put(key, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
        const keys = await cache.keys();
        if (keys.length > CACHE_MAX_ENTRIES) {
          for (const old of keys.slice(0, keys.length - CACHE_MAX_ENTRIES + 100)) await cache.delete(old);
        }
      } catch {}
    }
    return blob;
  })();

  inflight.set(key, job);
  job.then(
    () => inflight.delete(key),
    () => inflight.delete(key)
  );
  return job;
}

export function explainAzureError(err: unknown): string {
  const code = err instanceof AzureTtsError ? err.code : 'unknown';
  switch (code) {
    case 'config':
      return 'Giọng Azure chưa được cài trên máy chủ (thiếu khóa trên Vercel). Tạm thời hãy chọn giọng của máy.';
    case 'auth':
      return 'Cần đăng nhập lại để dùng giọng Azure.';
    case 'forbidden':
      return 'Tài khoản này không được phép dùng giọng Azure.';
    case 'quota':
      return 'Đã hết hạn mức miễn phí của Azure trong tháng. Hãy chọn giọng của máy, hạn mức sẽ làm mới vào đầu tháng sau.';
    case 'azure-key':
      return 'Azure từ chối khóa. Kiểm tra lại khóa và vùng (region) đã dán vào Vercel.';
    case 'network':
      return 'Không kết nối được. Kiểm tra mạng rồi bấm phát lại.';
    default:
      return `Giọng Azure đang lỗi (${code}). Thử lại sau hoặc chọn giọng của máy.`;
  }
}
