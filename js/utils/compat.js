export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function last(array, fallback) {
  return array && array.length ? array[array.length - 1] : fallback;
}

export function observeResize(element, callback) {
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(function () { callback(); });
    observer.observe(element);
    return function () { observer.disconnect(); };
  }

  let frame = null;
  const handler = function () {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      frame = null;
      callback();
    });
  };
  window.addEventListener('resize', handler, { passive: true });
  return function () {
    if (frame !== null) cancelAnimationFrame(frame);
    window.removeEventListener('resize', handler);
  };
}

export function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Storage can be unavailable in private/file contexts. The app remains usable.
  }
}

export function dispatchAppEvent(name, detail) {
  let event;
  if (typeof CustomEvent === 'function') {
    event = new CustomEvent(name, { detail: detail });
  } else {
    event = document.createEvent('CustomEvent');
    event.initCustomEvent(name, false, false, detail);
  }
  document.dispatchEvent(event);
}
