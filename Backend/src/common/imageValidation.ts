const MAGIC_BYTES: Record<string, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
};

const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/;

export function isValidAvatarDataUrl(value: string): boolean {
  const match = value.match(DATA_URL_PATTERN);
  if (!match) return false;

  const [, type, base64] = match;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return false;
  }

  if (buffer.length === 0) return false;

  if (type === "webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  const magic = MAGIC_BYTES[type];
  return magic.every((byte, i) => buffer[i] === byte);
}
