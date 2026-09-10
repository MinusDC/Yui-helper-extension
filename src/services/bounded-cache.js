export class BoundedCache {
  constructor(limit) {
    this.limit = limit;
    this.values = new Map();
  }

  get(key) {
    if (!this.values.has(key)) {
      return undefined;
    }

    const value = this.values.get(key);
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.values.has(key)) {
      this.values.delete(key);
    }

    this.values.set(key, value);
    if (this.values.size > this.limit) {
      this.values.delete(this.values.keys().next().value);
    }
  }
}
