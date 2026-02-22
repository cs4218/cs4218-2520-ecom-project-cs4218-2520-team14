//Teng Hui Xin Alicia, A0259064Y
import userModel from "../models/userModel.js";
import { getAllUsersController } from "../controllers/authController.js";

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: {},
}));
jest.mock("../helpers/authHelper.js", () => ({
  __esModule: true,
  hashPassword: jest.fn(),
}));


const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

describe("getAllUsersController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns users without passwords and sorted by createdAt desc", async () => {
    const req = {};
    const res = makeRes();

    const users = [
      { _id: "u2", name: "Admin", email: "a@a.com" },
      { _id: "u1", name: "User", email: "u@u.com" },
    ];

    const sortMock = jest.fn().mockResolvedValueOnce(users);
    const selectMock = jest.fn().mockReturnValueOnce({ sort: sortMock });

    userModel.find.mockReturnValueOnce({ select: selectMock });

    await getAllUsersController(req, res);

    expect(userModel.find).toHaveBeenCalledWith({});
    expect(selectMock).toHaveBeenCalledWith("-password");
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(users);
  });

  it("handles errors by returning 500 with failure payload", async () => {
    const req = {};
    const res = makeRes();

    const err = new Error("DB down");

    userModel.find.mockImplementationOnce(() => {
      throw err;
    });

    await getAllUsersController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting users",
      error: err,
    });
  });
});