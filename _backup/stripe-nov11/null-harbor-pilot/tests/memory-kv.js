export function memoryKv(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    async get(key, opts) {
      if (!map.has(key)) return null;
      const val = map.get(key);
      const type = typeof opts === "string" ? opts : opts && opts.type;
      if (type === "arrayBuffer") {
        if (val instanceof ArrayBuffer) return val;
        if (val instanceof Uint8Array) return val.buffer.slice(val.byteOffset, val.byteOffset + val.byteLength);
        return new TextEncoder().encode(String(val)).buffer;
      }
      if (val instanceof ArrayBuffer) return new TextDecoder().decode(val);
      if (val instanceof Uint8Array) return new TextDecoder().decode(val);
      return val;
    },
    async put(key, val, _opts) { map.set(key, val); },
    async delete(key) { map.delete(key); },
    _map: map,
  };
}
