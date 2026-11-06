import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { chunkText } from '../utils/text';
import {
  AZURE_MONTHLY_LIMIT,
  AZURE_PREFIX,
  AZURE_VOICES,
  explainAzureError,
  getAzureAudio,
  getAzureUsage,
} from '../services/azureTts';

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
const KEY_VOICE = 'slothful_tts_voice_v2';
const DEFAULT_VOICE = `${AZURE_PREFIX}${AZURE_VOICES[0].id}`;
const AZURE_CHUNK = 700; // ký tự mỗi lần gọi Azure (ít lần gọi hơn, ngắt hơi ở cuối câu)

// Âm thanh rỗng để "mở khóa" thẻ audio ngay trong lúc người dùng chạm (iOS chỉ cho phát sau thao tác chạm)
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAIARKwAAIhYAQACABAAZGF0YQQAAAAAAAAA';

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
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(() => {
    const saved = Number(localStorage.getItem(KEY_RATE));
    return RATES.includes(saved) ? saved : 1;
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceId, setVoiceId] = useState(() => localStorage.getItem(KEY_VOICE) ?? DEFAULT_VOICE);

  // Giá trị mới nhất cho các callback chạy lâu (sự kiện của bộ đọc)
  const paragraphsRef = useRef(paragraphs);
  paragraphsRef.current = paragraphs;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const voiceRef = useRef(voiceId);
  voiceRef.current = voiceId;
  const hasNextRef = useRef(hasNext);
  hasNextRef.current = hasNext;
  const onNextRef = useRef(onNextChapter);
  onNextRef.current = onNextChapter;
  const onActiveRef = useRef(onActiveIndex);
  onActiveRef.current = onActiveIndex;

  const [notice, setNotice] = useState('');
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Phải gọi ngay trong lúc người dùng chạm; sau đó thẻ audio này phát được tiếp mà không cần chạm lại
  const unlockAudio = () => {
    if (!voiceRef.current.startsWith(AZURE_PREFIX)) return;
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = 'auto';
      audioRef.current = a;
    }
    const a = audioRef.current;
    if (a.paused && !a.src) {
      a.src = SILENT_WAV;
      a.play().catch(() => {});
    }
  };

  const stopAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.onended = null;
    a.onerror = null;
    if (a.src === SILENT_WAV) return; // âm rỗng để mở khóa: để nó tự kết thúc, đừng ngắt giữa chừng
    a.pause();
  };

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    stopAudio();
    setLoading(false);
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const speakFrom = useCallback(
    (i: number) => {
      const paras = paragraphsRef.current;
      const isAzure = voiceRef.current.startsWith(AZURE_PREFIX);
      tokenRef.current += 1;
      const token = tokenRef.current;
      stopAudio();
      if (supported) {
        const synth = window.speechSynthesis;
        // Chỉ hủy khi đang có gì đó đọc: cancel() ngay trước speak() làm một số điện thoại không phát tiếng
        if (synth.speaking || synth.pending) synth.cancel();
        if (!isAzure) synth.resume();
      }
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      setNotice('');
      setLoading(false);

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

      const fail = (msg: string) => {
        playingRef.current = false;
        setPlaying(false);
        setLoading(false);
        tokenRef.current += 1;
        setNotice(msg);
      };

      // ---------- Giọng Azure: tải mp3 từng đoạn rồi phát ----------
      if (isAzure) {
        const azureVoice = voiceRef.current.slice(AZURE_PREFIX.length);
        const chunks = chunkText(paras[i], AZURE_CHUNK);
        let k = 0;

        // Tải trước vài đoạn kế tiếp để chuyển đoạn không bị khựng
        const prefetch = () => {
          let count = 0;
          for (let kk = k; kk < chunks.length && count < 4; kk++, count++) {
            getAzureAudio(chunks[kk], azureVoice).catch(() => {});
          }
          for (let p = i + 1; p < paras.length && count < 4; p++) {
            for (const c of chunkText(paras[p], AZURE_CHUNK)) {
              if (count >= 4) break;
              getAzureAudio(c, azureVoice).catch(() => {});
              count++;
            }
          }
        };

        const playNext = async () => {
          if (token !== tokenRef.current) return;
          if (k >= chunks.length) {
            speakFrom(i + 1);
            return;
          }
          const text = chunks[k++];
          try {
            setLoading(true);
            const blob = await getAzureAudio(text, azureVoice);
            if (token !== tokenRef.current) return;
            const audio = audioRef.current;
            if (!audio) throw new Error('no-audio');
            const url = URL.createObjectURL(blob);
            audio.onended = () => {
              URL.revokeObjectURL(url);
              playNext();
            };
            audio.onerror = () => {
              if (token === tokenRef.current) fail('Không phát được âm thanh. Bấm phát lại hoặc chọn giọng khác.');
            };
            audio.src = url;
            audio.defaultPlaybackRate = rateRef.current;
            audio.playbackRate = rateRef.current;
            await audio.play();
            if (token !== tokenRef.current) return;
            setLoading(false);
            prefetch();
          } catch (err: any) {
            if (token !== tokenRef.current) return;
            if (err?.code === 'config') {
              // Azure chưa được cài trên máy chủ: tạm dùng giọng của máy (không lưu lựa chọn, cài xong Azure sẽ tự dùng lại)
              voiceRef.current = '';
              setVoiceId('');
              speakFrom(i);
              setNotice('Giọng Azure chưa được cài, đang dùng giọng của máy.');
            } else if (err?.name === 'NotAllowedError') fail(explainError('not-allowed'));
            else if (err?.name === 'AbortError') return; // bị chặn do vừa chuyển đoạn khác
            else fail(explainAzureError(err));
          }
        };
        playNext();
        return;
      }

      // ---------- Giọng của máy (Web Speech) ----------
      if (!supported) {
        fail('Trình duyệt này không có giọng đọc của máy. Hãy chọn giọng Azure.');
        return;
      }
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
          fail(explainError(e.error));
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
      const a = audioRef.current;
      if (a) {
        a.onended = null;
        a.onerror = null;
        a.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      onActiveRef.current(null);
    },
    []
  );

  const play = () => {
    if (paragraphsRef.current.length === 0) return;
    unlockAudio();
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
    unlockAudio();
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
    const a = audioRef.current;
    if (voiceRef.current.startsWith(AZURE_PREFIX)) {
      // Giọng Azure: đổi tốc độ phát ngay, không cần tải lại
      if (a) {
        a.defaultPlaybackRate = value;
        a.playbackRate = value;
      }
    } else if (playingRef.current) {
      speakFrom(indexRef.current);
    }
  };

  const changeVoice = (value: string) => {
    setVoiceId(value);
    voiceRef.current = value;
    localStorage.setItem(KEY_VOICE, value);
    unlockAudio();
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
  const usingAzure = voiceId.startsWith(AZURE_PREFIX);
  const used = getAzureUsage();

  const btn =
    'w-11 h-11 flex items-center justify-center rounded-full text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40';

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-3xl mx-auto px-3 py-2">
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
            {paragraphs.length === 0
              ? 'Đang tải...'
              : loading
              ? 'Đang tải giọng...'
              : `Đoạn ${Math.min(index + 1, paragraphs.length)}/${paragraphs.length}`}
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

        {notice && <p className="m-0 pb-1.5 text-xs leading-snug text-amber-700 dark:text-amber-400">{notice}</p>}

        <div className="pb-1">
          <select
            value={voiceId}
            onChange={(e) => changeVoice(e.target.value)}
            aria-label="Giọng đọc"
            className="w-full h-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs px-2"
          >
            <optgroup label="Giọng tự nhiên (Azure, cần mạng)">
              {AZURE_VOICES.map((v) => (
                <option key={v.id} value={`${AZURE_PREFIX}${v.id}`}>
                  {v.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Giọng của máy">
              <option value="">
                {viVoices.length > 0 ? 'Tự chọn giọng tiếng Việt tốt nhất' : 'Giọng mặc định của máy'}
              </option>
              {voiceOptions.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){qualityLabel(v) ? ` · ${qualityLabel(v)}` : ''}
                </option>
              ))}
            </optgroup>
          </select>
          {usingAzure && (
            <p className="m-0 mt-1 text-[11px] text-neutral-500 font-mono">
              Đã dùng ≈ {used.toLocaleString('vi-VN')}/{AZURE_MONTHLY_LIMIT.toLocaleString('vi-VN')} ký tự miễn phí tháng này
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
