import JWT from "jsonwebtoken";
import { requireSignIn } from "./authMiddleware.js";

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

const makeReqResNext = () => {
  const req = {
    headers: {},
    user: undefined,
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  const next = jest.fn();

  return { req, res, next };
};

describe("requireSignIn middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.JWT_SECRET = "test_secret";
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("401 when authorization header missing", async () => {
    const { req, res, next } = makeReqResNext();

    await requireSignIn(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Authorization header missing",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("supports Bearer token format", async () => {
    const { req, res, next } = makeReqResNext();

    req.headers.authorization = "Bearer token123";
    JWT.verify.mockReturnValue({ _id: "u1" });

    await requireSignIn(req, res, next);

    expect(JWT.verify).toHaveBeenCalledWith("token123", "test_secret");
    expect(req.user).toEqual({ _id: "u1" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("supports raw token format", async () => {
    const { req, res, next } = makeReqResNext();

    req.headers.authorization = "rawtoken";
    JWT.verify.mockReturnValue({ _id: "u1" });

    await requireSignIn(req, res, next);

    expect(JWT.verify).toHaveBeenCalledWith("rawtoken", "test_secret");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("401 when token missing after Bearer", async () => {
    const { req, res, next } = makeReqResNext();

    req.headers.authorization = "Bearer ";

    await requireSignIn(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Token missing",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 when JWT verify throws", async () => {
    const { req, res, next } = makeReqResNext();

    req.headers.authorization = "Bearer badtoken";
    JWT.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });
    

    await requireSignIn(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
