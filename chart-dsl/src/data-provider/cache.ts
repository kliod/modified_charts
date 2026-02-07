/**
 * LRU Cache для кэширования REST ответов
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number = 50) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /**
   * Получить значение по ключу
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Переместить в конец (самый недавно использованный)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * Установить значение
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Обновить существующий
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Удалить самый старый (первый в Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Удалить значение
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Очистить кэш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Проверить наличие ключа
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Получить размер кэша
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Запись кэша с TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number; // Time to live в миллисекундах
}

/**
 * Кэш с TTL
 */
export class TTLCache<K, V> {
  private cache: LRUCache<K, CacheEntry<V>>;
  private defaultTTL: number;

  constructor(capacity: number = 50, defaultTTL: number = 3600000) { // 1 час по умолчанию
    this.cache = new LRUCache(capacity);
    this.defaultTTL = defaultTTL;
  }

  /**
   * Получить значение
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Проверить TTL
    if (entry.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        return undefined;
      }
    }

    return entry.data;
  }

  /**
   * Установить значение
   */
  set(key: K, value: V, ttl?: number): void {
    const entry: CacheEntry<V> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
  }

  /**
   * Удалить значение
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Очистить кэш
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Проверить наличие ключа
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined;
  }

  /**
   * Получить размер кэша
   */
  get size(): number {
    return this.cache.size;
  }
}
