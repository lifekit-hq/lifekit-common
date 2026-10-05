/** Test helper: decodes an 8-bit RGBA, non-interlaced PNG (what resvg emits) to pixels. */
import {inflateSync} from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isPng(buffer) {
  return buffer.subarray(0, 8).equals(SIGNATURE);
}

export function pngSize(buffer) {
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(buffer) {
  if (!isPng(buffer)) throw new Error('not a PNG');
  const {width, height} = pngSize(buffer);
  const [bitDepth, colorType, , , interlace] = buffer.subarray(24, 29);
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`unsupported PNG: depth ${bitDepth}, colour type ${colorType}`);
  }
  const idat = [];
  for (let at = 8; at < buffer.length;) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') idat.push(buffer.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
      const predictor = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
      pixels[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  return {width, height, pixels};
}
