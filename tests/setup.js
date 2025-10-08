// Jest setup file for Chrome Extension API mocks

// Mock Chrome APIs
global.chrome = {
  tabs: {
    onCreated: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    onActivated: { addListener: jest.fn() },
    query: jest.fn(),
    get: jest.fn(),
    group: jest.fn()
  },
  tabGroups: {
    TAB_GROUP_ID_NONE: -1,
    query: jest.fn(),
    update: jest.fn(),
    onCreated: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    onMoved: { addListener: jest.fn() }
  },
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        // Default empty settings
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    }
  },
  notifications: {
    create: jest.fn((id, options, callback) => {
      if (callback) {
        callback(id);
      }
      return Promise.resolve(id);
    }),
    clear: jest.fn((id, callback) => {
      if (callback) {
        callback(true);
      }
      return Promise.resolve(true);
    }),
    onClicked: { addListener: jest.fn() }
  },
  runtime: {
    onMessage: { addListener: jest.fn() },
    lastError: null
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Mock global fetch for LLM API calls
global.fetch = jest.fn();

// Mock console to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
