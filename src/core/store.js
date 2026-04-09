function deepClone(value) {
  // structuredClone is supported in modern browsers; fall back for safety.
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export class Store {
  /** @param {any} initialState */
  constructor(initialState) {
    this._state = deepClone(initialState);
    /** @type {Set<(state:any)=>void>} */
    this._listeners = new Set();
  }

  getState() {
    return this._state;
  }

  /**
   * @param {object | ((state:any)=>any)} update
   */
  setState(update) {
    const nextState =
      typeof update === 'function'
        ? update(this._state)
        : { ...this._state, ...update };

    this._state = nextState;
    for (const listener of this._listeners) listener(this._state);
  }

  /** @param {(state:any)=>void} listener */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}
