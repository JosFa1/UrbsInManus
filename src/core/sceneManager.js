import { clear } from '../ui/dom.js';

export class SceneManager {
  /**
   * @param {HTMLElement} root
   * @param {{ store:any, eventBus:any }} context
   */
  constructor(root, context) {
    this._root = root;
    this._context = context;
    /** @type {Map<string, (ctx:any)=>any>} */
    this._registry = new Map();
    this._active = null;
  }

  /**
   * @param {string} id
   * @param {(ctx: any) => { mount(root:HTMLElement): (void|Promise<void>), unmount(): void }} factory
   */
  register(id, factory) {
    this._registry.set(id, factory);
  }

  /**
   * @param {string} id
   */
  async goTo(id) {
    const factory = this._registry.get(id);
    if (!factory) throw new Error(`Scene not registered: ${id}`);

    if (this._active) {
      try {
        this._active.unmount();
      } finally {
        this._active = null;
        clear(this._root);
      }
    }

    const scene = factory(this._context);
    this._active = scene;
    await scene.mount(this._root);
  }
}
