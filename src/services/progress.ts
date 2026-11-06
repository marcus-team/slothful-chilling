// Vị trí đọc dở của từng bộ truyện, đồng bộ giữa các thiết bị:
//   users/{uid}/progress/{novelId} -> { chapterId, scrollRatio, updatedAt }
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface RemoteProgress {
  novelId: string;
  chapterId: string;
  scrollRatio: number;
  updatedAt: number;
}

export async function loadProgress(uid: string): Promise<RemoteProgress[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'progress'));
  const list: RemoteProgress[] = [];
  snap.docs.forEach((d) => {
    const x = d.data() as Partial<RemoteProgress>;
    if (typeof x.chapterId === 'string') {
      list.push({
        novelId: d.id,
        chapterId: x.chapterId,
        scrollRatio: typeof x.scrollRatio === 'number' ? x.scrollRatio : 0,
        updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : 0,
      });
    }
  });
  return list;
}

export async function saveProgress(uid: string, p: RemoteProgress): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'progress', p.novelId), {
    chapterId: p.chapterId,
    scrollRatio: p.scrollRatio,
    updatedAt: p.updatedAt,
  });
}
