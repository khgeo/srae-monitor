// Small DOM helpers: element builder, modal, toast, confirm, download.

import { t } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function h(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

export function toast(msg, kind = 'info', ms = 4200) {
  const box = $('#toasts');
  const el = h(`<div class="toast ${kind}" role="status">${esc(msg)}</div>`);
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
}

let modalClose = null;
export function openModal({ title, body, actions = [], wide = false, onClose }) {
  const m = $('#modal');
  $('#modalTitle').textContent = title;
  const b = $('#modalBody');
  b.innerHTML = '';
  if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
  const f = $('#modalFoot');
  f.innerHTML = '';
  for (const a of actions) {
    const btn = h(`<button class="btn ${a.kind || ''}">${esc(a.label)}</button>`);
    btn.addEventListener('click', async () => {
      const keep = a.onClick ? await a.onClick() : false;
      if (keep !== true) closeModal();
    });
    f.appendChild(btn);
  }
  f.hidden = !actions.length;
  m.classList.toggle('wide', wide);
  m.hidden = false;
  modalClose = onClose || null;
  const first = b.querySelector('input, select, textarea, button');
  if (first) setTimeout(() => first.focus(), 30);
  return b;
}

export function closeModal() {
  const m = $('#modal');
  if (m.hidden) return;
  m.hidden = true;
  const cb = modalClose; modalClose = null;
  if (cb) cb();
}

export function confirmBox(message, okLabel) {
  return new Promise((resolve) => {
    let answered = false;
    openModal({
      title: t('ui.confirm'),
      body: `<p>${esc(message)}</p>`,
      actions: [
        { label: t('ui.cancel'), onClick: () => { answered = true; resolve(false); } },
        { label: okLabel || t('ui.ok'), kind: 'danger', onClick: () => { answered = true; resolve(true); } },
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

export function download(filename, data, type = 'application/json') {
  const blob = data instanceof Blob ? data : new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slug(s) {
  return String(s || 'field').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
}

/** Lazily load a classic script once (used for optional import libraries). */
const loaded = new Map();
export function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = () => { loaded.delete(src); rej(new Error(`Could not load ${src}`)); };
      document.head.appendChild(s);
    }));
  }
  return loaded.get(src);
}
