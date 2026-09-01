export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeRaw(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    // хранилище недоступно — удалить не удалось
    return false;
  }
}
