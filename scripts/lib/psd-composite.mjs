import { inflateSync } from 'node:zlib';

// Read Photoshop's saved composite, rather than approximating layer blending.
// Adobe PSD specification: RGB, 8-bit, version 1; raw/RLE/ZIP composite data.
export function decodePsdComposite(bytes) {
  const b = Buffer.from(bytes);
  const need = (offset, length) => {
    if (!Number.isSafeInteger(length) || length < 0 || offset + length > b.length) throw new Error('Truncated PSD');
  };
  need(0, 26);
  if (b.toString('ascii', 0, 4) !== '8BPS' || b.readUInt16BE(4) !== 1) throw new Error('Use a standard PSD, not PSB');
  const channels = b.readUInt16BE(12), height = b.readUInt32BE(14), width = b.readUInt32BE(18);
  if (b.readUInt16BE(22) !== 8 || b.readUInt16BE(24) !== 3) throw new Error('PSD preview requires 8-bit RGB; save an RGB copy in Photoshop');
  if (!width || !height || width * height > 32_000_000 || channels < 3 || channels > 16) throw new Error('Unsupported PSD dimensions/channels');
  let offset = 26;
  const skip = () => { need(offset, 4); const n = b.readUInt32BE(offset); need(offset + 4, n); offset += 4 + n; };
  skip(); // colour mode data
  skip(); // image resources
  need(offset, 4);
  const sectionLength = b.readUInt32BE(offset);
  need(offset + 4, sectionLength);
  let transparent = false;
  if (sectionLength >= 6 && b.readUInt32BE(offset + 4) > 0) transparent = b.readInt16BE(offset + 8) < 0;
  offset += 4 + sectionLength;
  need(offset, 2);
  const compression = b.readUInt16BE(offset); offset += 2;
  const size = width * height, length = size * channels;
  let planes;
  if (compression === 0) { need(offset, length); planes = b.subarray(offset, offset + length); }
  else if (compression === 1) {
    const rows = channels * height;
    need(offset, rows * 2);
    const table = offset; offset += rows * 2;
    planes = Buffer.alloc(length);
    for (let row = 0; row < rows; row++) {
      const count = b.readUInt16BE(table + row * 2), end = offset + count;
      need(offset, count);
      let output = row * width;
      while (offset < end) {
        const control = b.readInt8(offset++);
        if (control >= 0) {
          const n = control + 1;
          if (offset + n > end || output + n > (row + 1) * width) throw new Error('Invalid PSD RLE literal');
          b.copy(planes, output, offset, offset + n); offset += n; output += n;
        } else if (control !== -128) {
          const n = 1 - control;
          if (offset >= end || output + n > (row + 1) * width) throw new Error('Invalid PSD RLE run');
          planes.fill(b[offset++], output, output + n); output += n;
        }
      }
      if (output !== (row + 1) * width) throw new Error('Incomplete PSD RLE row');
    }
  } else if (compression === 2 || compression === 3) {
    planes = inflateSync(b.subarray(offset), { maxOutputLength: length });
    if (planes.length !== length) throw new Error('Invalid PSD ZIP data');
    if (compression === 3) {
      for (let row = 0; row < channels * height; row++) {
        for (let x = 1; x < width; x++) { const i = row * width + x; planes[i] = (planes[i] + planes[i - 1]) & 255; }
      }
    }
  } else throw new Error(`Unsupported PSD compression: ${compression}`);
  const data = Buffer.alloc(size * 4);
  for (let i = 0; i < size; i++) {
    data[i * 4] = planes[i]; data[i * 4 + 1] = planes[size + i]; data[i * 4 + 2] = planes[size * 2 + i];
    data[i * 4 + 3] = transparent && channels >= 4 ? planes[size * 3 + i] : 255;
  }
  return { data, width, height, channels: 4 };
}
