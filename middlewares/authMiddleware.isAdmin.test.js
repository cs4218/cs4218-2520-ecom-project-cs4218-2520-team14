import userModel from "../models/userModel.js";
import { isAdmin } from "./authMiddleware.js";

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const makeReqResNext = () => {
  const req = {
    user: {},
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  const next = jest.fn();

  return { req, res, next };
};

describe("isAdmin middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("401 when req.user._id missing", async () => {
    const { req, res, next } = makeReqResNext();

    await isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "UnAuthorized Access",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when user not found", async () => {
    const { req, res, next } = makeReqResNext();
    req.user = { _id: "u1" };

    userModel.findById.mockResolvedValue(null);

    await isAdmin(req, res, next);

    expect(userModel.findById).toHaveBeenCalledWith("u1");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when role is not admin", async () => {
    const { req, res, next } = makeReqResNext();
    req.user = { _id: "u1" };

    userModel.findById.mockResolvedValue({ _id: "u1", role: 0 });

    await isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user is admin", async () => {
    const { req, res, next } = makeReqResNext();
    req.user = { _id: "u1" };

    userModel.findById.mockResolvedValue({ _id: "u1", role: 1 });

    await isAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("500 when DB throws", async () => {
    const { req, res, next } = makeReqResNext();
    req.user = { _id: "u1" };

    userModel.findById.mockRejectedValue(new Error("DB error"));

    await isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in admin middleware",
      error: expect.any(Error),
    });
    expect(next).not.toHaveBeenCalled();
  });
});
