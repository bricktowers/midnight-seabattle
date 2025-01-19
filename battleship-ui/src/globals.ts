import { Buffer } from 'buffer';

// While Vite maps the mode that the application is running in by setting either the
// `PROD` or `DEV` variables, we also need to ensure that `NODE_ENV` is set correctly
// because we also use third-party libraries within the browser (such as Apollo Client),
// that might expect it.
//
// @ts-expect-error - support third-party libraries that require `NODE_ENV`.
globalThis.process = {
  env: {
    NODE_ENV: import.meta.env.MODE, // Map `MODE` to `process.env.NODE_ENV`.
  },
};

// We'll also make use of `Buffer` objects, so we'll ensure a pollyfill for one is
// present on the global object.
globalThis.Buffer = Buffer;
