import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, drawPixel) {
  // 1. Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // 3. IDAT Chunk (Raw scanlines: 1 filter byte + width * 4 bytes per row)
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData.writeUInt8(0, rowOffset); // filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData.writeUInt8(r, pixelOffset);
      rawData.writeUInt8(g, pixelOffset + 1);
      rawData.writeUInt8(b, pixelOffset + 2);
      rawData.writeUInt8(a, pixelOffset + 3);
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // 4. IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcVal = crc32(typeAndData);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

// Draw a beautiful green and gold agricultural icon
function drawFarmerIcon(x, y, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const r = width / 2;

  // Background: rich emerald green gradient (#15803d)
  const dist = Math.hypot(x - cx, y - cy);
  
  // Base green
  let red = 21;
  let green = 128;
  let blue = 61;
  let alpha = 255;

  // Circular / rounded border (gold ring)
  const ringInner = r * 0.88;
  const ringOuter = r * 0.96;
  if (dist >= ringInner && dist <= ringOuter) {
    // Gold ring
    red = 251;
    green = 191;
    blue = 36;
  } else if (dist < ringInner) {
    // Inner center emblem (stalk of grass / sheaves in gold)
    const nx = (x - cx) / r; // -1 to 1
    const ny = (y - cy) / r; // -1 to 1

    // Draw stylized grass sheaf stems and grains
    const inCentralStem = Math.abs(nx) < 0.05 && ny >= -0.55 && ny <= 0.55;
    const inLeftStem = Math.abs(nx + 0.18 - (ny * 0.15)) < 0.04 && ny >= -0.35 && ny <= 0.45;
    const inRightStem = Math.abs(nx - 0.18 + (ny * 0.15)) < 0.04 && ny >= -0.35 && ny <= 0.45;
    
    // Grains on the stem (oval bundles)
    const grain1 = Math.hypot(nx, ny + 0.35) < 0.12;
    const grain2 = Math.hypot(nx, ny + 0.15) < 0.13;
    const grain3 = Math.hypot(nx, ny - 0.05) < 0.14;
    const grain4 = Math.hypot(nx - 0.22, ny + 0.1) < 0.11;
    const grain5 = Math.hypot(nx + 0.22, ny + 0.1) < 0.11;
    const grain6 = Math.hypot(nx - 0.25, ny - 0.1) < 0.11;
    const grain7 = Math.hypot(nx + 0.25, ny - 0.1) < 0.11;

    if (inCentralStem || inLeftStem || inRightStem || grain1 || grain2 || grain3 || grain4 || grain5 || grain6 || grain7) {
      // Golden yellow for crop (#fbbf24)
      red = 251;
      green = 191;
      blue = 36;
    } else {
      // Gentle radial highlight
      const highlight = Math.max(0, 1 - dist / (r * 0.85)) * 25;
      green = Math.min(255, green + highlight);
    }
  }

  return [Math.round(red), Math.round(green), Math.round(blue), alpha];
}

// Generate icon-192.png
const png192 = createPNG(192, 192, drawFarmerIcon);
fs.writeFileSync('public/icon-192.png', png192);
console.log('Created public/icon-192.png (' + png192.length + ' bytes)');

// Generate icon-512.png
const png512 = createPNG(512, 512, drawFarmerIcon);
fs.writeFileSync('public/icon-512.png', png512);
console.log('Created public/icon-512.png (' + png512.length + ' bytes)');

// Generate maskable-icon-512.png
fs.writeFileSync('public/maskable-icon-512.png', png512);
console.log('Created public/maskable-icon-512.png (' + png512.length + ' bytes)');
