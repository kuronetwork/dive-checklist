/* storage.js — localStorage abstraction for dive-checklist.v1.* */

const DiveStorage = (() => {
  let _available = null;

  function available() {
    if (_available !== null) return _available;
    try {
      const testKey = '__dive_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      _available = true;
    } catch (e) {
      _available = false;
    }
    return _available;
  }

  function get(key, defaultValue = null) {
    if (!available()) return defaultValue;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  function set(key, value) {
    if (!available()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // quota exceeded or other error — fail silently
    }
  }

  function remove(key) {
    if (!available()) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // fail silently
    }
  }

  return { available, get, set, remove };
})();
