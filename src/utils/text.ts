// Tách nội dung chương thành các đoạn (dùng chung cho màn đọc và đọc to để chỉ số đoạn khớp nhau)
export function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// Cắt đoạn dài thành các câu ngắn để bộ đọc không bị ngắt giữa chừng
export function chunkText(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?…。！？\n]+[.!?…。！？]*\s*/g) || [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + s).length > max) {
      chunks.push(cur.trim());
      cur = '';
    }
    cur += s;
    while (cur.length > max * 1.5) {
      const cut = cur.lastIndexOf(' ', max) > 0 ? cur.lastIndexOf(' ', max) : max;
      chunks.push(cur.slice(0, cut).trim());
      cur = cur.slice(cut);
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter((c) => c.length > 0);
}
