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

export function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // хранилище недоступно — удалять нечего
  }
}

/** sessionStorage: живёт до закрытия вкладки. Используется только для разблокировки админки. */
export function readTemp(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeTemp(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // не сохранилось — PIN спросят ещё раз, это не ошибка
  }
}
