import '@testing-library/jest-dom';

// Extend global type to include electronAPI
declare global {
  var electronAPI: {
    send: jest.Mock<any, any>;
    on: jest.Mock<any, any>;
  };
}

// Mock Electron APIs
global.electronAPI = {
  send: jest.fn(),
  on: jest.fn(),
};

