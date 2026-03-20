/**
 * Stub for node-localstorage.
 *
 * GramJS's StoreSession depends on node-localstorage, but we only use
 * StringSession (which has no fs dependency). This stub prevents Metro
 * from trying to resolve the entire legacy levelDB / asyncstorage-down
 * chain at build time.
 */
class LocalStorage {
  constructor() {
    this._data = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this._data, key)
      ? this._data[key]
      : null;
  }
  setItem(key, value) {
    this._data[key] = String(value);
  }
  removeItem(key) {
    delete this._data[key];
  }
  clear() {
    this._data = {};
  }
  get length() {
    return Object.keys(this._data).length;
  }
}

module.exports = { LocalStorage };
