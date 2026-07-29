export function toPrismaBytes(buffer: Buffer): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(buffer) as Uint8Array<ArrayBuffer>;
}
