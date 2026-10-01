/**
 * Generates placeholder PWA icons (192x192 and 512x512) using only Node.js built-ins.
 * Dark background (#09090b) with "CM" text in cyan (#00e5ff).
 * Run: node scripts/generate-icons.mjs
 */
import { createWriteStream } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function generatePng(size) {
  const bg = { r: 0x09, g: 0x09, b: 0x0b };
  const fg = { r: 0x00, g: 0xe5, b: 0xff };

  // Build raw pixel rows
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      // Draw a simple "CM" shape by painting two rectangles as letter placeholders
      const cx = size / 2;
      const cy = size / 2;
      const pad = Math.floor(size * 0.18);
      const thick = Math.max(2, Math.floor(size * 0.08));

      // Letter C: left half arc approximated as a U-shape open to the right
      const cLeft = pad;
      const cRight = Math.floor(cx - pad * 0.3);
      const cTop = pad;
      const cBot = size - pad;
      const inC =
        (x >= cLeft && x < cLeft + thick && y >= cTop && y < cBot) ||
        (y >= cTop && y < cTop + thick && x >= cLeft && x < cRight) ||
        (y >= cBot - thick && y < cBot && x >= cLeft && x < cRight);

      // Letter M: right half
      const mLeft = Math.floor(cx + pad * 0.3);
      const mRight = size - pad;
      const mMid = Math.floor((mLeft + mRight) / 2);
      const mPeak = Math.floor(cTop + (cBot - cTop) * 0.35);
      const inM =
        (x >= mLeft && x < mLeft + thick && y >= cTop && y < cBot) ||
        (x >= mRight - thick && x < mRight && y >= cTop && y < cBot) ||
        // left diagonal
        (Math.abs((y - cTop) - ((x - mLeft) / (mMid - mLeft)) * (mPeak - cTop)) < thick * 0.9 &&
          x >= mLeft && x <= mMid && y >= cTop && y <= mPeak) ||
        // right diagonal
        (Math.abs((y - mPeak) - ((x - mMid) / (mRight - mMid)) * (cTop - mPeak)) < thick * 0.9 &&
          x >= mMid && x <= mRight && y >= cTop && y <= mPeak);

      const [r, g, b] = (inC || inM) ? [fg.r, fg.g, fg.b] : [bg.r, bg.g, bg.b];
      row[1 + x * 3] = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = deflateSync(raw, { level: 6 });

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  return Buffer.concat([
    header,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const buf = generatePng(size);
  const path = join(PUBLIC, `icon-${size}.png`);
  createWriteStream(path).end(buf);
  console.log(`Generated ${path} (${buf.length} bytes)`);
}
