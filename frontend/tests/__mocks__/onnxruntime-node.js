// Mock for onnxruntime-node
module.exports = {
  InferenceSession: {
    create: jest.fn(),
  },
  Tensor: jest.fn((type, data, dims) => ({ type, data, dims })),
};
