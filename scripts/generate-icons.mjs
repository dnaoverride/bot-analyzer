import {writeFile, mkdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../extension/icons', import.meta.url)));
await mkdir(root, {recursive: true});

function png(width, height, r = 90, g = 140, b = 220) {
  const row = Buffer.alloc(1 + width * 3);
  const rows = [];
  for (let y = 0; y < height; y++) {
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const i = 1 + x * 3;
      const edge = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
      row[i] = edge ? 30 : r;
      row[i + 1] = edge ? 40 : g;
      row[i + 2] = edge ? 60 : b;
    }
    rows.push(Buffer.from(row));
  }
  const data = Buffer.concat(rows);
  const crc = buf => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ ~0) >>> 0;
  };
  const chunk = (type, payload) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(payload.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, payload]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(crcBuf));
    return Buffer.concat([len, t, payload, c]);
  };
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const compressed = deflateSync(data);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [16, 32, 48, 128]) {
  await writeFile(join(root, `icon${size}.png`), png(size, size));
}
await writeFile(join(root, 'promo440x280.png'), png(440, 280, 70, 110, 180));
console.log('Icons written to extension/icons');
