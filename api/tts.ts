// Hàm chạy trên Vercel: nhận một đoạn chữ, nhờ Azure Speech đọc, trả về file mp3.
// Khóa Azure nằm trong biến môi trường của Vercel, không bao giờ gửi xuống trình duyệt.
//   AZURE_SPEECH_KEY     khóa của dịch vụ Speech
//   AZURE_SPEECH_REGION  vùng của dịch vụ (ví dụ southeastasia)
//   ALLOWED_EMAILS       các email được phép dùng, cách nhau bằng dấu phẩy

const FIREBASE_API_KEY = 'AIzaSyDTW6vXaLwNuDqPoNRBAbiumaJJdUVGvyA'; // khóa web công khai của Firebase
const VOICES = new Set(['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural']);
const MAX_CHARS = 1500;

// Nhớ các token đã kiểm tra trong vài phút để khỏi gọi Google cho mỗi đoạn
const verified = new Map<string, { email: string; until: number }>();

async function emailOf(idToken: string): Promise<string | null> {
  const hit = verified.get(idToken);
  if (hit && hit.until > Date.now()) return hit.email;

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  const user = data?.users?.[0];
  if (!user?.email || user.emailVerified === false) return null;
  const email = String(user.email).toLowerCase();
  verified.set(idToken, { email, until: Date.now() + 5 * 60 * 1000 });
  if (verified.size > 200) verified.clear();
  return email;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Chỉ nhận POST' });
    return;
  }

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  const allowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!key || !region || allowed.length === 0) {
    res.status(500).json({ error: 'config', message: 'Chưa cấu hình Azure trên Vercel.' });
    return;
  }

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const email = token ? await emailOf(token) : null;
  if (!email) {
    res.status(401).json({ error: 'auth', message: 'Cần đăng nhập lại.' });
    return;
  }
  if (!allowed.includes(email)) {
    res.status(403).json({ error: 'forbidden', message: 'Tài khoản này không được phép dùng giọng đọc.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const text = String(body.text || '').trim();
  const voice = VOICES.has(body.voice) ? body.voice : 'vi-VN-HoaiMyNeural';
  if (!text) {
    res.status(400).json({ error: 'empty', message: 'Không có chữ để đọc.' });
    return;
  }
  if (text.length > MAX_CHARS) {
    res.status(400).json({ error: 'too-long', message: `Đoạn dài quá ${MAX_CHARS} ký tự.` });
    return;
  }

  const ssml =
    `<speak version='1.0' xml:lang='vi-VN' xmlns='http://www.w3.org/2001/10/synthesis'>` +
    `<voice name='${voice}'>${escapeXml(text)}</voice></speak>`;

  try {
    const azure = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'slothfulchilling',
      },
      body: ssml,
    });

    if (!azure.ok) {
      const detail = await azure.text().catch(() => '');
      console.error('Azure TTS lỗi', azure.status, detail.slice(0, 300));
      const code = azure.status === 429 ? 'quota' : azure.status === 401 || azure.status === 403 ? 'azure-key' : 'azure';
      res.status(azure.status === 429 ? 429 : 502).json({ error: code, message: `Azure trả về lỗi ${azure.status}.` });
      return;
    }

    const audio = Buffer.from(await azure.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(audio);
  } catch (err: any) {
    console.error('Azure TTS không gọi được', err);
    res.status(502).json({ error: 'network', message: 'Không gọi được Azure.' });
  }
}
