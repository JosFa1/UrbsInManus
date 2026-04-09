export class EventBus {
  constructor() {
    /** @type {Map<string, Set<(payload:any)=>void>>} */
    this._listeners = new Map();
  }

  /**
   * @param {string} type
   * @param {(payload:any)=>void} handler
   */
  on(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(handler);
    return () => {
      this._listeners.get(type)?.delete(handler);
    };
  }

  /**
   * @param {string} type
   * @param {any} payload
   */
  emit(type, payload) {
    const set = this._listeners.get(type);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] handler error for ${type}`, err);
      }
    }
  }
}
