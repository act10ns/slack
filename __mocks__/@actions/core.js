module.exports = {
  getInput: jest.fn().mockReturnValue(''),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn()
}
