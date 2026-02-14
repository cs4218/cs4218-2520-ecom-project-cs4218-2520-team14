// controllers/auth.testController.test.js

import { testController } from "./authController.js";

const makeRes = () => {
  const res = {};
  res.send = jest.fn().mockReturnValue(res);
  return res;
};



describe("testController", () => {
  it('sends "Protected Routes"', () => {
    const req = {};
    const res = makeRes();

    testController(req, res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith("Protected Routes");
  });
});
