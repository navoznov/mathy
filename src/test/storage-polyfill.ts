/**
 * Минимальная реализация Web Storage для тестов.
 *
 * Тесты доменного слоя и хранилища не трогают DOM, поэтому полноценное
 * окружение браузера (jsdom, happy-dom) не нужно. jsdom вдобавок не
 * запускается на Node 22.11: тянет CJS-пакет, который делает require()
 * ESM-модуля. Здесь нужен ровно localStorage/sessionStorage — и настоящий
 * класс Storage, чтобы тесты могли подменять Storage.prototype.getItem
 * и проверять поведение при недоступном хранилище.
 */
class MemoryStorage {
  #data = new Map<string, string>();

  get length(): number {
    return this.#data.size;
  }

  getItem(key: string): string | null {
    return this.#data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#data.set(key, String(value));
  }

  removeItem(key: string): void {
    this.#data.delete(key);
  }

  clear(): void {
    this.#data.clear();
  }

  key(index: number): string | null {
    return [...this.#data.keys()][index] ?? null;
  }
}

globalThis.Storage = MemoryStorage as unknown as typeof Storage;
globalThis.localStorage = new MemoryStorage() as unknown as Storage;
globalThis.sessionStorage = new MemoryStorage() as unknown as Storage;
