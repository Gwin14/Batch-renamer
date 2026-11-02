import { zlibSync } from 'fflate';

/** Tiny PNG encoder (no deps besides fflate) used for sample photo thumbnails. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

type RGB = [number, number, number];

/** Vertical gradient "landscape" with a soft horizon — reads as a photo at thumbnail size. */
export function gradientPng(width: number, height: number, top: RGB, bottom: RGB, ground: RGB): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height);
  const horizon = Math.floor(height * 0.66);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      let c: RGB;
      if (y < horizon) {
        const t = y / horizon;
        c = [0, 1, 2].map((i) => Math.round(top[i] + (bottom[i] - top[i]) * t)) as RGB;
      } else {
        const wave = Math.sin((x / width) * Math.PI * 2) * 2;
        const t = Math.min(1, (y - horizon + wave) / (height - horizon));
        c = [0, 1, 2].map((i) => Math.round(ground[i] * (1 - t * 0.35))) as RGB;
      }
      raw.set(c, row + 1 + x * 3);
    }
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array())];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export interface SampleSpec {
  name: string;
  kind: 'photo' | 'text';
  palette?: [RGB, RGB, RGB];
  takenAt: number;
  width?: number;
  height?: number;
  size: number;
  duration?: number;
}

const d = (y: number, m: number, day: number, h = 12, mi = 0, s = 0) => new Date(y, m - 1, day, h, mi, s).getTime();

const SUNSET: [RGB, RGB, RGB] = [[44, 62, 107], [242, 148, 96], [52, 58, 64]];
const BEACH: [RGB, RGB, RGB] = [[120, 178, 222], [214, 232, 244], [222, 196, 150]];
const FOREST: [RGB, RGB, RGB] = [[150, 186, 196], [222, 230, 218], [62, 98, 70]];
const CITY: [RGB, RGB, RGB] = [[86, 96, 120], [196, 186, 180], [70, 70, 78]];
const SNOW: [RGB, RGB, RGB] = [[170, 196, 224], [236, 242, 248], [232, 236, 242]];
const DESERT: [RGB, RGB, RGB] = [[230, 170, 120], [246, 214, 170], [196, 132, 84]];

/** A realistic messy camera-roll + downloads folder. */
export const SAMPLE_FILES: SampleSpec[] = [
  { name: 'IMG_4821.JPG', kind: 'photo', palette: SUNSET, takenAt: d(2026, 7, 14, 19, 42, 8), width: 4032, height: 3024, size: 3_412_220 },
  { name: 'IMG_4822.JPG', kind: 'photo', palette: BEACH, takenAt: d(2026, 7, 15, 10, 3, 51), width: 4032, height: 3024, size: 2_980_114 },
  { name: 'IMG_4830.HEIC', kind: 'photo', palette: FOREST, takenAt: d(2026, 7, 16, 8, 21, 0), width: 3024, height: 4032, size: 1_904_331 },
  { name: 'WhatsApp Image 2026-08-03 at 18.44.10.jpeg', kind: 'photo', palette: CITY, takenAt: d(2026, 8, 3, 18, 44, 10), width: 1600, height: 1200, size: 284_002 },
  { name: 'Screenshot 2026-10-14 at 09.12.33.png', kind: 'photo', palette: SNOW, takenAt: d(2026, 10, 14, 9, 12, 33), width: 1179, height: 2556, size: 612_400 },
  { name: 'DSC01234.JPG', kind: 'photo', palette: DESERT, takenAt: d(2025, 12, 28, 16, 5, 44), width: 6000, height: 4000, size: 8_120_554 },
  { name: 'foto 2.jpg', kind: 'photo', palette: BEACH, takenAt: d(2026, 1, 2, 11, 0, 0), width: 2048, height: 1536, size: 940_110 },
  { name: 'foto 10.jpg', kind: 'photo', palette: SUNSET, takenAt: d(2026, 1, 2, 11, 5, 0), width: 2048, height: 1536, size: 902_420 },
  { name: 'Relatório Final (1).pdf', kind: 'text', takenAt: d(2026, 9, 30, 17, 20, 0), size: 482_220 },
  { name: 'Relatório Final - Cópia.pdf', kind: 'text', takenAt: d(2026, 9, 30, 17, 25, 0), size: 482_301 },
  { name: 'nota fiscal   março 🧾.pdf', kind: 'text', takenAt: d(2026, 3, 12, 9, 0, 0), size: 120_884 },
  { name: 'artista_-_faixa_de_verão.mp3', kind: 'text', takenAt: d(2025, 11, 20, 22, 10, 0), size: 6_402_002, duration: 214 },
];

export function sampleBytes(spec: SampleSpec): Uint8Array {
  if (spec.kind === 'photo' && spec.palette) {
    const portrait = (spec.height ?? 0) > (spec.width ?? 0);
    return gradientPng(portrait ? 48 : 64, portrait ? 64 : 48, ...spec.palette);
  }
  const text = `Arquivo de exemplo do Lote: ${spec.name}\n`;
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}
