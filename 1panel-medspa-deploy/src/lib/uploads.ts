export function getUploadFileName(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  const name = normalized.split('/').filter(Boolean).pop() ?? '';

  if (!name || name === '.' || name === '..' || name.includes('\0')) {
    throw new Error('Invalid upload file name');
  }

  return name;
}

export function getUploadUrl(value: string): string {
  const name = getUploadFileName(value);
  return `/api/uploads/${encodeURIComponent(name)}`;
}

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || `${process.cwd()}/public/uploads`;
}
