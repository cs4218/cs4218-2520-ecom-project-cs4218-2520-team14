//Name: Shauryan Agrawal
//Student ID: A0265846N

import JWT from "jsonwebtoken";
import { requireSignIn } from "./authMiddleware.js";

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

const makeReqResNext = (overrides = {}) => {
  const req = {
    headers: {},
    user: undefined,
    ...overrides,
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  const next = jest.fn();

  return { req, res, next };
};

describe("requireSignIn middleware (complete branch + behavior coverage)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.JWT_SECRET = "test_secret";
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("401 when authorization header missing (no JWT.verify call)", async () => {
    const { req, res, next } = makeReqResNext();

    await requireSignIn(req, res, next);

    expect(JWT.verify).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Authorization header missing",
    });

    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when authorization header exists but is empty string", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "";

    await requireSignIn(req, res, next);

    // Your code checks !authHeader first => treated as missing
    expect(JWT.verify).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Authorization header missing",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("supports Bearer token format: 'Bearer <token>'", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "Bearer token123";

    JWT.verify.mockReturnValueOnce({ _id: "u1" });

    await requireSignIn(req, res, next);

    expect(JWT.verify).toHaveBeenCalledTimes(1);
    expect(JWT.verify).toHaveBeenCalledWith("token123", "test_secret");

    expect(req.user).toEqual({ _id: "u1" });

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("supports raw token format: '<token>'", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "rawtoken";

    JWT.verify.mockReturnValueOnce({ _id: "u2" });

    await requireSignIn(req, res, next);

    expect(JWT.verify).toHaveBeenCalledTimes(1);
    expect(JWT.verify).toHaveBeenCalledWith("rawtoken", "test_secret");

    expect(req.user).toEqual({ _id: "u2" });

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("401 when header is exactly 'Bearer ' (token missing after split)", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "Bearer ";

    await requireSignIn(req, res, next);

    expect(JWT.verify).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Token missing",
    });

    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when header is 'Bearer' (no space) -> treated as raw token and verify throws -> invalid/expired", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "Bearer";

    JWT.verify.mockImplementationOnce(() => {
      throw new Error("bad token");
    });

    await requireSignIn(req, res, next);

    // because it does NOT startWith("Bearer "), it passes "Bearer" as token
    expect(JWT.verify).toHaveBeenCalledTimes(1);
    expect(JWT.verify).toHaveBeenCalledWith("Bearer", "test_secret");

    expect(console.log).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token",
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("supports multiple spaces: 'Bearer    token' -> split(' ')[1] becomes '' => Token missing", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "Bearer    token";

    // With your current implementation: authHeader.split(" ")[1]
    // "Bearer    token".split(" ") => ["Bearer", "", "", "", "token"]
    // index 1 => "" => missing token branch
    await requireSignIn(req, res, next);

    expect(JWT.verify).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Token missing",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when JWT.verify throws (logs + invalid/expired token response)", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "Bearer badtoken";

    JWT.verify.mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });

    await requireSignIn(req, res, next);

    expect(JWT.verify).toHaveBeenCalledTimes(1);
    expect(JWT.verify).toHaveBeenCalledWith("badtoken", "test_secret");

    expect(console.log).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token",
    });

    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it("does not call next twice (sanity)", async () => {
    const { req, res, next } = makeReqResNext();
    req.headers.authorization = "Bearer token123";

    JWT.verify.mockReturnValueOnce({ _id: "u1" });

    await requireSignIn(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});