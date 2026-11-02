import { useEffect } from 'react';

import { kindOf } from '@/engine/text';
import { isWeb } from '@/services/env';
import { useStudio } from '@/store/studio';

const tried = new Set<string>();

/** Fills in width/height for images imported without metadata (Files app, device folders). */
export function useEnrichMedia() {
  const files = useStudio((s) => s.files);
  useEffect(() => {
    if (isWeb) return;
    const pending = files.filter((f) => !f.width && kindOf(f.name) === 'image' && !tried.has(f.uri)).slice(0, 60);
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      const { Image } = await import('expo-image');
      for (const f of pending) {
        if (cancelled) return;
        tried.add(f.uri);
        try {
          const ref = await Image.loadAsync(f.uri);
          const w = Math.round(ref.width * (ref.scale || 1));
          const h = Math.round(ref.height * (ref.scale || 1));
          ref.release?.();
          if (w && h) useStudio.getState().patchFile(f.id, { width: w, height: h });
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);
}
