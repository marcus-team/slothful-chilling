// Google OAuth trực tiếp qua Google Identity Services (GIS) — không dùng Firebase.
// Chỉ cần OAuth Client ID (loại Web) trong Google Cloud, với domain app nằm trong
// "Authorized JavaScript origins".

// Đặt trong .env.local (local) hoặc Environment Variables (Vercel): VITE_GOOGLE_CLIENT_ID
const CLIENT_ID: string = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const SCOPES = [
  DRIVE_SCOPE,
  'openid',
  'email',
  'profile',
].join(' ');

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const STORAGE_KEY_SESSION = 'slothful_google_session';

export interface GoogleUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface StoredSession {
  user: GoogleUser;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;
let tokenClient: any = null;
let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Không tải được Google Identity Services. Kiểm tra kết nối mạng.'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

interface TokenResult {
  accessToken: string;
}

// Xin access token. prompt = '' thì thử lấy âm thầm nếu người dùng đã cấp quyền trước đó.
function requestToken(
  prompt: '' | 'select_account' | 'consent' | 'select_account consent'
): Promise<TokenResult> {
  if (!CLIENT_ID) {
    return Promise.reject(
      new Error('Chưa cấu hình VITE_GOOGLE_CLIENT_ID (Google OAuth Client ID).')
    );
  }
  return loadGis().then(
    () =>
      new Promise<TokenResult>((resolve, reject) => {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error || !resp.access_token) {
              reject(new Error(resp.error_description || resp.error || 'Không thể lấy access token từ Google'));
              return;
            }
            // Màn cấp quyền cho phép bỏ tick từng quyền: kiểm tra đã được quyền Drive chưa
            const hasDrive = (window as any).google.accounts.oauth2.hasGrantedAllScopes(
              resp,
              DRIVE_SCOPE
            );
            if (!hasDrive) {
              cachedAccessToken = null;
              localStorage.removeItem(STORAGE_KEY_SESSION);
              reject(
                new Error(
                  'Bạn chưa cấp quyền xem Google Drive. Hãy đăng nhập lại và tick ô "See and download all your Google Drive files".'
                )
              );
              return;
            }
            cachedAccessToken = resp.access_token;
            tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 60_000;
            resolve({ accessToken: resp.access_token });
          },
          error_callback: (err: any) => {
            // popup_closed, popup_failed_to_open, ...
            reject(new Error(err?.message || err?.type || 'Đăng nhập Google bị hủy'));
          },
        });
        tokenClient.requestAccessToken({ prompt });
      })
  );
}

async function fetchUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Không lấy được thông tin tài khoản Google (HTTP ${res.status})`);
  }
  const data = await res.json();
  return {
    displayName: data.name ?? null,
    email: data.email ?? null,
    photoURL: data.picture ?? null,
  };
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

// Gọi khi mở app: nếu trước đó đã đăng nhập thì thử lấy lại token âm thầm.
// Trình duyệt có thể chặn popup khi không có thao tác bấm — khi đó coi như chưa đăng nhập
// và người dùng bấm "Đăng nhập Google" lại.
export const initAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  let cancelled = false;
  const session = readSession();

  if (!session) {
    onAuthFailure?.();
    return () => {};
  }

  requestToken('')
    .then(({ accessToken }) => {
      if (!cancelled) onAuthSuccess?.(session.user, accessToken);
    })
    .catch(() => {
      if (!cancelled) onAuthFailure?.();
    });

  return () => {
    cancelled = true;
  };
};

export const googleSignIn = async (): Promise<{ user: GoogleUser; accessToken: string }> => {
  // 'consent' ép Google hiện lại màn cấp quyền, để tick lại quyền Drive nếu trước đó bỏ sót
  const { accessToken } = await requestToken('select_account consent');
  const user = await fetchUser(accessToken);
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ user } satisfies StoredSession));
  return { user, accessToken };
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) return cachedAccessToken;
  if (!readSession()) return null;
  try {
    const { accessToken } = await requestToken('');
    return accessToken;
  } catch {
    return null;
  }
};

export const logout = async (): Promise<void> => {
  const token = cachedAccessToken;
  cachedAccessToken = null;
  tokenExpiresAt = 0;
  localStorage.removeItem(STORAGE_KEY_SESSION);
  if (token) {
    try {
      await loadGis();
      (window as any).google.accounts.oauth2.revoke(token, () => {});
    } catch {
      // bỏ qua: token tự hết hạn sau ~1 giờ
    }
  }
};
