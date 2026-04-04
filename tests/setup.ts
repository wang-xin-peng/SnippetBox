import '@testing-library/jest-dom';

// Mock Electron APIs
global.electronAPI = {
  send: jest.fn(),
  on: jest.fn(),
};
