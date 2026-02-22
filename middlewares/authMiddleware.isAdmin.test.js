//Name: Shauryan Agrawal
//Student ID: A0265846N

import userModel from "../models/userModel.js";
import { isAdmin } from "./authMiddleware.js";

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const makeReqResNext = (overrides = {}) => {
  const req = {
    user: {},
    ...overrides,
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  const next = jest.fn();

  return { req, res, next };
};

describe("isAdmin middleware (complete branch + behavior coverage)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  const unauthorizedPayload = {
    success: false,
    message: "UnAuthorized Access",
  };

  it("401 when req.user is missing entirely", async () => {
    const { req, res, next } = makeReqResNext({ user: undefined });

    await isAdmin(req, res, next);

    expect(userModel.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(unauthorizedPayload);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when req.user._id is missing", async () => {
    const { req, res, next } = makeReqResNext({ user: {} });

    await isAdmin(req, res, next);

    expect(userModel.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(unauthorizedPayload);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when req.user._id is falsy (empty string)", async () => {
    const { req, res, next } = makeReqResNext({ user: { _id: "" } });

    await isAdmin(req, res, next);

    expect(userModel.findById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(unauthorizedPayload);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when user not found in DB", async () => {
    const { req, res, next } = makeReqResNext({ user: { _id: "u1" } });

    userModel.findById.mockResolvedValueOnce(null);

    await isAdmin(req, res, next);

    expect(userModel.findById).toHaveBeenCalledTimes(1);
    expect(userModel.findById).toHaveBeenCalledWith("u1");

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(unauthorizedPayload);

    expect(next).not.toHaveBeenCalled();
  });

  it("401 when user exists but role is not admin (role !== 1)", async () => {
    const { req, res, next } = makeReqResNext({ user: { _id: "u1" } });

    userModel.findById.mockResolvedValueOnce({ _id: "u1", role: 0 });

    await isAdmin(req, res, next);

    expect(userModel.findById).toHaveBeenCalledTimes(1);
    expect(userModel.findById).toHaveBeenCalledWith("u1");

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(unauthorizedPayload);

    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user is admin (role === 1)", async () => {
    const { req, res, next } = makeReqResNext({ user: { _id: "u1" } });

    userModel.findById.mockResolvedValueOnce({ _id: "u1", role: 1 });

    await isAdmin(req, res, next);

    expect(userModel.findById).toHaveBeenCalledTimes(1);
    expect(userModel.findById).toHaveBeenCalledWith("u1");

    expect(next).toHaveBeenCalledTimes(1);

    // On success, middleware should not send error responses
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("500 when DB throws (logs + sends error payload)", async () => {
    const { req, res, next } = makeReqResNext({ user: { _id: "u1" } });

    const err = new Error("DB error");
    userModel.findById.mockRejectedValueOnce(err);

    await isAdmin(req, res, next);

    expect(userModel.findById).toHaveBeenCalledTimes(1);
    expect(userModel.findById).toHaveBeenCalledWith("u1");

    expect(console.log).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in admin middleware",
      error: expect.any(Error),
    });

    expect(next).not.toHaveBeenCalled();
  });
});