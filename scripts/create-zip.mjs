import { createWriteStream, readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";

// Minimal ZIP builder using Node.js built-ins only
// https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDate(d) {
  return ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
}
function dosTime(d) {
  return (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
}

function writeUint16LE(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; }
function writeUint32LE(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); return b; }

function collectFiles(dir, base) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = join(base, name);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...collectFiles(full, rel));
    else if (!rel.endsWith(".map")) out.push({ full, rel });
  }
  return out;
}

const deployDir = new URL("../deploy", import.meta.url).pathname;
const outPath = new URL("../viewviet-hostinger.zip", import.meta.url).pathname;

const files = collectFiles(deployDir, "viewviet-hostinger");
const centralDir = [];
let offset = 0;
const chunks = [];

const now = new Date();
const dDate = dosDate(now);
const dTime = dosTime(now);

for (const { full, rel } of files) {
  const data = readFileSync(full);
  const nameBytes = Buffer.from(rel.replace(/\\/g, "/"), "utf8");
  const crc = crc32(data);
  const size = data.length;

  const localHeader = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x03, 0x04]),
    writeUint16LE(20),       // version needed
    writeUint16LE(0),        // flags
    writeUint16LE(0),        // compression: stored
    writeUint16LE(dTime),
    writeUint16LE(dDate),
    writeUint32LE(crc),
    writeUint32LE(size),     // compressed size
    writeUint32LE(size),     // uncompressed size
    writeUint16LE(nameBytes.length),
    writeUint16LE(0),        // extra field length
    nameBytes,
  ]);

  centralDir.push({ nameBytes, crc, size, offset, dDate, dTime });
  offset += localHeader.length + size;
  chunks.push(localHeader, data);
  process.stdout.write(`  + ${rel} (${(size/1024).toFixed(1)} KB)\n`);
}

// Central directory
const centralChunks = [];
for (const e of centralDir) {
  const cd = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x01, 0x02]),
    writeUint16LE(20),  // version made by
    writeUint16LE(20),  // version needed
    writeUint16LE(0),   // flags
    writeUint16LE(0),   // compression: stored
    writeUint16LE(e.dTime),
    writeUint16LE(e.dDate),
    writeUint32LE(e.crc),
    writeUint32LE(e.size),
    writeUint32LE(e.size),
    writeUint16LE(e.nameBytes.length),
    writeUint16LE(0),  // extra
    writeUint16LE(0),  // comment
    writeUint16LE(0),  // disk start
    writeUint16LE(0),  // internal attr
    writeUint32LE(0),  // external attr
    writeUint32LE(e.offset),
    e.nameBytes,
  ]);
  centralChunks.push(cd);
}

const cdBuf = Buffer.concat(centralChunks);
const cdSize = cdBuf.length;
const cdOffset = offset;

// End of central directory record
const eocd = Buffer.concat([
  Buffer.from([0x50, 0x4B, 0x05, 0x06]),
  writeUint16LE(0),
  writeUint16LE(0),
  writeUint16LE(centralDir.length),
  writeUint16LE(centralDir.length),
  writeUint32LE(cdSize),
  writeUint32LE(cdOffset),
  writeUint16LE(0),
]);

const finalBuf = Buffer.concat([...chunks, cdBuf, eocd]);
import { writeFileSync } from "fs";
writeFileSync(outPath, finalBuf);

const sizeMB = (finalBuf.length / 1024 / 1024).toFixed(2);
console.log(`\n✓ Created: viewviet-hostinger.zip (${sizeMB} MB, ${files.length} files)`);
