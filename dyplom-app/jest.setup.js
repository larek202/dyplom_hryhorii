global.__DEV__ = true;

if (!global.FormData) {
  global.FormData = class FormDataMock {
    constructor() {
      this.append = jest.fn();
    }
  };
}

