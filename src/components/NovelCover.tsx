import React from 'react';

// Bìa truyện: ảnh nếu có, không thì ô màu theo tên truyện kèm chữ cái đầu
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

interface NovelCoverProps {
  title: string;
  cover?: string;
  className?: string;
}

export const NovelCover: React.FC<NovelCoverProps> = ({ title, cover, className = '' }) => {
  if (cover) {
    return (
      <img
        src={cover}
        alt=""
        loading="lazy"
        className={`object-cover bg-neutral-200 dark:bg-neutral-800 ${className}`}
      />
    );
  }
  const hue = hueOf(title);
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center font-serif font-bold text-white/90 select-none ${className}`}
      style={{ background: `linear-gradient(160deg, hsl(${hue} 30% 38%), hsl(${(hue + 40) % 360} 35% 22%))` }}
    >
      <span className="text-3xl">{title.trim().charAt(0).toUpperCase() || '?'}</span>
    </div>
  );
};
