/**
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param  {...any} children
 */
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  const a = attrs || {};

  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'dataset') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = String(dv);
    } else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else {
      node.setAttribute(k, String(v));
    }
  }

  for (const child of children.flat()) {
    if (child === undefined || child === null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }

  return node;
}

/** @param {HTMLElement} node */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * @param {HTMLElement|Window|Document} target
 * @param {string} type
 * @param {(ev:any)=>void} handler
 */
export function listen(target, type, handler) {
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}
