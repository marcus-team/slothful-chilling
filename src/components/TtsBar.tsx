import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { chunkText } from '../utils/text';

interface TtsBarProps {
  paragraphs: string[];
  chapterId: string;
  onNextChapter: () => void; // gọi khi đọc hết chương; thanh sẽ tự đọc tiếp chương mới khi nội dung tải xong
  hasNext: boolean;
  onActiveIndex: (index: number | null) => void;
  onClose: () => void;
}

const RATES = [0.8, 1, 1.2, 1.5, 1.8, 2];
const KEY_RATE = 'slothful_tts_rate';
const KEY_VOICE = 'slothful_tts_voice';

// Mức chất lượng suy ra từ mã giọng của hệ thống (iOS ghi rõ compact / enhanced / premium trong voiceURI)
const qualityRank = (v: SpeechSynthesisVoice): number => {
  const id = `${v.voiceURI} ${v.name}`.toLowerCase();
  if (id.includes('premium')) return 3;
  if (id.includes('enhanced') || id.includes('nâng cao')) return 2;
  if (id.includes('compact')) return 0;
  return 1;
};
const qualityLabel = (v: SpeechSynthesisVoice): string => {
  const r = qualityRank(v);
  return r === 3 ? 'cao cấp' : r === 2 ? 'nâng cao' : r === 0 ? 'thường' : '';
};
const bestFirst = (list: SpeechSynthesisVoice[]) =>
  [...list].sort((a, b) => qualityRank(b) - qualityRank(a));

const explainError = (code: string): string => {
  switch (code) {
    case 'not-allowed':
      return 'Trình duyệt chặn phát tiếng. Hãy bấm nút phát lại một lần nữa.';
    case 'language-unavailable':
    case 'voice-unavailable':
    case 'synthesis-unavailable':
      return 'Máy chưa có giọng đọc phù hợp. Vào Cài đặt điện thoại > Chuyển văn bản thành giọng nói, cài giọng Tiếng Việt rồi thử lại.';
    case 'silent':
      return 'Chưa nghe thấy tiếng? Kiểm tra âm lượng và chế độ im lặng của điện thoại, và đã cài giọng Tiếng Việt chưa (Cài đặt > Chuyển văn bản thành giọng nói).';
    default:
      return `Không đọc được (${code}). Thử chọn giọng khác ở ô bên dưới.`;
  }
};

// Đoạn đầu tiên đang hiện trên màn hình (để bắt đầu đọc từ chỗ người dùng đang xem)
const firstVisibleParagraph = (): number => {
  const els = document.querySelectorAll<HTMLElement>('[data-para]');
  for (const el of Array.from(els)) {
    if (el.getBoundingClientRect().bottom > 70) return Number(el.dataset.para) || 0;
  }
  return 0;
};

export const TtsBar: React.FC<TtsBarProps> = ({
  paragraphs,
  chapterId,
  onNextChapter,
  hasNext,
  onActiveIndex,
  onClose,
}) => {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(() => {
    const saved = Number(localStorage.getItem(KEY_RATE));
    return RATES.includes(saved) ? saved : 1;
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem(KEY_VOICE) || '');

  // Giá trị mới nhất cho các callback chạy lâu (sự kiện của bộ đọc)
  const paragraphsRef = useRef(paragraphs);
  paragraphsRef.current = paragraphs;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const voiceRef = useRef(voiceURI);
  voiceRef.current = voiceURI;
  const hasNextRef = useRef(hasNext);
  hasNextRef.current = hasNext;
  const onNextRef = useRef(onNextChapter);
  onNextRef.current = onNextChapter;
  const onActiveRef = useRef(onActiveIndex);
  onActiveRef.current = onActiveIndex;

  const [notice, setNotice] = useState('');
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);
  const indexRef = useRef(0);
  const startedRef = useRef(false);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, [supported]);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const speakFrom = useCallback(
    (i: number) => {
      if (!supported) return;
      const paras = paragraphsRef.current;
      tokenRef.current += 1;
      const token = tokenRef.current;
      const synth = window.speechSynthesis;
      // Chỉ hủy khi đang có gì đó đọc: cancel() ngay trước speak() làm một số điện thoại không phát tiếng
      if (synth.speaking || synth.pending) synth.cancel();
      synth.resume();
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      setNotice('');

      if (i >= paras.length) {
        if (hasNextRef.current) {
          // Sang chương kế; effect bên dưới sẽ đọc tiếp khi nội dung mới tải xong
          indexRef.current = 0;
          startedRef.current = false;
          setIndex(0);
          onNextRef.current();
        } else {
          playingRef.current = false;
          setPlaying(false);
        }
        return;
      }

      indexRef.current = i;
      setIndex(i);
      onActiveRef.current(i);

      const chunks = chunkText(paras[i]);
      let k = 0;
      const next = () => {
        if (token !== tokenRef.current) return;
        if (k >= chunks.length) {
          speakFrom(i + 1);
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[k++]);
        u.rate = rateRef.current;
        const all = window.speechSynthesis.getVoices();
        const chosen = all.find((v) => v.voiceURI === voiceRef.current);
        const viVoice = bestFirst(all.filter((v) => v.lang.toLowerCase().startsWith('vi')))[0];
        const voice = chosen || viVoice;
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        // Máy không có giọng tiếng Việt thì không ép ngôn ngữ, để dùng giọng mặc định (vẫn nghe được)
        u.onstart = () => {
          if (startTimerRef.current) clearTimeout(startTimerRef.current);
          setNotice('');
        };
        u.onend = next;
        u.onerror = (e) => {
          if (token !== tokenRef.current) return;
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          // Lỗi thật: dừng lại và báo lý do, không lướt qua các đoạn trong im lặng
          playingRef.current = false;
          setPlaying(false);
          tokenRef.current += 1;
          setNotice(explainError(e.error));
        };
        window.speechSynthesis.speak(u);
        // Không bắt đầu phát sau vài giây: gợi ý các nguyên nhân thường gặp
        if (startTimerRef.current) clearTimeout(startTimerRef.current);
        startTimerRef.current = setTimeout(() => {
          if (token === tokenRef.current) setNotice(explainError('silent'));
        }, 4000);
      };
      next();
    },
    [supported]
  );

  // Có nội dung chương mới (hoặc đổi chương): đang đọc thì đọc tiếp từ đầu chương, không thì đứng yên
  useEffect(() => {
    startedRef.current = false;
    indexRef.current = 0;
    setIndex(0);
    if (!playingRef.current) {
      stop();
      return;
    }
    if (paragraphs.length === 0) return; // đang tải
    startedRef.current = true;
    speakFrom(0);
  }, [chapterId, paragraphs, speakFrom, stop]);

  // Đóng thanh thì dừng hẳn
  useEffect(
    () => () => {
      tokenRef.current += 1;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      onActiveRef.current(null);
    },
    []
  );

  const play = () => {
    if (paragraphsRef.current.length === 0) return;
    playingRef.current = true;
    setPlaying(true);
    const start = startedRef.current ? indexRef.current : firstVisibleParagraph();
    startedRef.current = true;
    speakFrom(start);
  };

  const pause = () => {
    playingRef.current = false;
    setPlaying(false);
    stop();
  };

  const step = (delta: number) => {
    const target = Math.min(Math.max(0, indexRef.current + delta), Math.max(0, paragraphsRef.current.length - 1));
    startedRef.current = true;
    if (playingRef.current) {
      speakFrom(target);
    } else {
      indexRef.current = target;
      setIndex(target);
      onActiveRef.current(target);
    }
  };

  const changeRate = (value: number) => {
    setRate(value);
    rateRef.current = value;
    localStorage.setItem(KEY_RATE, String(value));
    if (playingRef.current) speakFrom(indexRef.current);
  };

  const changeVoice = (uri: string) => {
    setVoiceURI(uri);
    voiceRef.current = uri;
    localStorage.setItem(KEY_VOICE, uri);
    if (playingRef.current) speakFrom(indexRef.current);
  };

  const close = () => {
    playingRef.current = false;
    stop();
    onActiveRef.current(null);
    onClose();
  };

  const viVoices = bestFirst(voices.filter((v) => v.lang.toLowerCase().startsWith('vi')));
  const voiceOptions = viVoices.length > 0 ? viVoices : voices;

  const btn =
    'w-11 h-11 flex items-center justify-center rounded-full text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40';

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-3xl mx-auto px-3 py-2">
        {!supported ? (
          <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
            <span>Trình duyệt này không hỗ trợ đọc to.</span>
            <button onClick={close} className={btn} aria-label="Đóng">
              <CloseOutlined />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button onClick={() => step(-1)} className={btn} aria-label="Đoạn trước">
                <StepBackwardOutlined />
              </button>
              <button
                onClick={playing ? pause : play}
                disabled={paragraphs.length === 0}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-40"
                aria-label={playing ? 'Tạm dừng' : 'Đọc to'}
              >
                {playing ? <PauseOutlined /> : <CaretRightOutlined />}
              </button>
              <button onClick={() => step(1)} className={btn} aria-label="Đoạn sau">
                <StepForwardOutlined />
              </button>

              <div className="flex-1 min-w-0 px-2 text-xs text-neutral-500 font-mono truncate">
                {paragraphs.length > 0 ? `Đoạn ${Math.min(index + 1, paragraphs.length)}/${paragraphs.length}` : 'Đang tải...'}
              </div>

              <select
                value={rate}
                onChange={(e) => changeRate(Number(e.target.value))}
                aria-label="Tốc độ đọc"
                className="h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm px-1"
              >
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}x
                  </option>
                ))}
              </select>
              <button onClick={close} className={btn} aria-label="Đóng đọc to">
                <CloseOutlined />
              </button>
            </div>

            {notice && (
              <p className="m-0 pb-1.5 text-xs leading-snug text-amber-700 dark:text-amber-400">{notice}</p>
            )}

            {voices.length > 0 && (
              <div className="pb-1">
                <select
                  value={voiceURI}
                  onChange={(e) => changeVoice(e.target.value)}
                  aria-label="Giọng đọc"
                  className="w-full h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs px-2"
                >
                  <option value="">
                    {viVoices.length > 0 ? 'Tự chọn giọng tiếng Việt tốt nhất' :'Máy chưa có giọng tiếng Việt, dùng giọng mặc định'}
                  </option>
                  {voiceOptions.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}){qualityLabel(v) ? ` · ${qualityLabel(v)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
