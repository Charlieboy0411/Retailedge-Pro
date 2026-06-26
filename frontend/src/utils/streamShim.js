// Shim for Node.js "stream" module in Vite client environment
export const Readable = class {
  constructor() {}
  on() { return this; }
  once() { return this; }
  emit() { return this; }
  pipe() { return this; }
};

export const Writable = class {
  constructor() {}
  on() { return this; }
  once() { return this; }
  emit() { return this; }
};

export const Duplex = class {
  constructor() {}
};

export const Transform = class {
  constructor() {}
};

export const PassThrough = class {
  constructor() {}
};

export const Stream = class {
  constructor() {}
};

export default {
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
  Stream
};
