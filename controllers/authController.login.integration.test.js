//Name: Shauryan Agrawal
//Student ID: A0265846N

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import JWT from "jsonwebtoken";
import { loginController } from "./authController.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

let mongoServer;

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (bodyOverrides = {}) => ({
  body: {
    email: "john@test.com",
    password: "pass123",
    ...bodyOverrides,
  },
});

const seedUser = async (overrides = {}) => {
  const plainPassword = overrides.plainPassword || "pass123";
  const hashedPassword = await hashPassword(plainPassword);

  const user = await new userModel({
    name: overrides.name || "John Doe",
    email: overrides.email || "john@test.com",
    password: hashedPassword,
    phone: overrides.phone || "1234567890",
    address: overrides.address || "Singapore",
    answer: overrides.answer || "Football",
    role: overrides.role ?? 0,
  }).save();

  return { user, plainPassword, hashedPassword };
};

describe("loginController integration tests (real DB + real helper + real model + real JWT)", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "integration-test-secret";

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  /* =========================================================
     SUCCESS PATH
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('valid login returns HTTP 200, success true, and message "login successfully"', async () => {
    await seedUser({
      email: "success@test.com",
      plainPassword: "correctPassword123",
    });

    const req = makeReq({
      email: "success@test.com",
      password: "correctPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "login successfully",
        user: expect.any(Object),
        token: expect.any(String),
      })
    );
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful login returns sanitized user object with expected fields", async () => {
    const { user } = await seedUser({
      name: "Alice",
      email: "alice@test.com",
      plainPassword: "alicePass123",
      phone: "88888888",
      address: "NUS",
      answer: "Blue",
      role: 0,
    });

    const req = makeReq({
      email: "alice@test.com",
      password: "alicePass123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];

    expect(payload.user).toEqual({
      _id: user._id,
      name: "Alice",
      email: "alice@test.com",
      phone: "88888888",
      address: "NUS",
      role: 0,
    });

    expect(payload.user.password).toBeUndefined();
    expect(payload.user.answer).toBeUndefined();
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful login returns a JWT token that can be verified with the same secret", async () => {
    const { user } = await seedUser({
      email: "jwt@test.com",
      plainPassword: "jwtPassword123",
    });

    const req = makeReq({
      email: "jwt@test.com",
      password: "jwtPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];

    expect(payload.token).toBeDefined();
    expect(typeof payload.token).toBe("string");

    const decoded = JWT.verify(payload.token, process.env.JWT_SECRET);

    expect(decoded).toEqual(
      expect.objectContaining({
        _id: String(user._id),
      })
    );
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful login token payload contains the persisted user's _id", async () => {
    const { user } = await seedUser({
      email: "tokenid@test.com",
      plainPassword: "tokenPass123",
    });

    const req = makeReq({
      email: "tokenid@test.com",
      password: "tokenPass123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];
    const decoded = JWT.verify(payload.token, process.env.JWT_SECRET);

    expect(String(decoded._id)).toBe(String(user._id));
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful login returns database user data correctly in the response", async () => {
    await seedUser({
      name: "Match Login User",
      email: "matchlogin@test.com",
      plainPassword: "matchPass123",
      phone: "77777777",
      address: "Tampines",
      answer: "Football",
      role: 0,
    });

    const req = makeReq({
      email: "matchlogin@test.com",
      password: "matchPass123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];
    const dbUser = await userModel.findOne({ email: "matchlogin@test.com" });

    expect(dbUser).not.toBeNull();

    expect(String(payload.user._id)).toBe(String(dbUser._id));
    expect(payload.user.name).toBe(dbUser.name);
    expect(payload.user.email).toBe(dbUser.email);
    expect(payload.user.phone).toBe(dbUser.phone);
    expect(payload.user.address).toBe(dbUser.address);
    expect(payload.user.role).toBe(dbUser.role);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful login does not modify or overwrite the existing user record", async () => {
    await seedUser({
      name: "Immutable User",
      email: "immutable@test.com",
      plainPassword: "immutablePass123",
      phone: "11111111",
      address: "Clementi",
      answer: "Chess",
      role: 0,
    });

    const beforeLogin = await userModel.findOne({ email: "immutable@test.com" });

    const req = makeReq({
      email: "immutable@test.com",
      password: "immutablePass123",
    });
    const res = makeRes();

    await loginController(req, res);

    const afterLogin = await userModel.findOne({ email: "immutable@test.com" });

    expect(afterLogin).not.toBeNull();
    expect(afterLogin.name).toBe(beforeLogin.name);
    expect(afterLogin.email).toBe(beforeLogin.email);
    expect(afterLogin.phone).toBe(beforeLogin.phone);
    expect(afterLogin.address).toBe(beforeLogin.address);
    expect(afterLogin.answer).toBe(beforeLogin.answer);
    expect(afterLogin.role).toBe(beforeLogin.role);
    expect(afterLogin.password).toBe(beforeLogin.password);
  });

  /* =========================================================
     MISSING CREDENTIALS
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing email returns HTTP 400 with message "Invalid email or password"', async () => {
    const req = makeReq({
      email: "",
      password: "somePassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email or password",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing password returns HTTP 400 with message "Invalid email or password"', async () => {
    const req = makeReq({
      email: "john@test.com",
      password: "",
    });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email or password",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing both email and password returns HTTP 400 with message "Invalid email or password"', async () => {
    const req = makeReq({
      email: "",
      password: "",
    });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email or password",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("missing credentials short-circuits before any DB login succeeds", async () => {
    await seedUser({
      email: "shortcircuit@test.com",
      plainPassword: "shortPass123",
    });

    const req = makeReq({
      email: "",
      password: "shortPass123",
    });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    const users = await userModel.find({ email: "shortcircuit@test.com" });
    expect(users).toHaveLength(1);
  });

  /* =========================================================
     USER NOT FOUND
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('non-existent email returns HTTP 404 with message "Email is not registerd"', async () => {
    const req = makeReq({
      email: "notfound@test.com",
      password: "anyPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Email is not registerd",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("user-not-found login attempt does not create any user record", async () => {
    const req = makeReq({
      email: "nouser@test.com",
      password: "randomPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

  /* =========================================================
     WRONG PASSWORD
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('wrong password returns HTTP 401 with message "Invalid Password"', async () => {
    await seedUser({
      email: "wrongpass@test.com",
      plainPassword: "correctPassword123",
    });

    const req = makeReq({
      email: "wrongpass@test.com",
      password: "wrongPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid Password",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("wrong password does not return a token", async () => {
    await seedUser({
      email: "notoken@test.com",
      plainPassword: "correctPassword123",
    });

    const req = makeReq({
      email: "notoken@test.com",
      password: "wrongPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];

    expect(payload.token).toBeUndefined();
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("wrong password does not mutate the persisted user record", async () => {
    await seedUser({
      name: "Protected User",
      email: "protected@test.com",
      plainPassword: "correctPassword123",
      phone: "99999999",
      address: "Jurong",
      answer: "Red",
      role: 0,
    });

    const beforeAttempt = await userModel.findOne({ email: "protected@test.com" });

    const req = makeReq({
      email: "protected@test.com",
      password: "wrongPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    const afterAttempt = await userModel.findOne({ email: "protected@test.com" });

    expect(afterAttempt).not.toBeNull();
    expect(afterAttempt.name).toBe(beforeAttempt.name);
    expect(afterAttempt.email).toBe(beforeAttempt.email);
    expect(afterAttempt.phone).toBe(beforeAttempt.phone);
    expect(afterAttempt.address).toBe(beforeAttempt.address);
    expect(afterAttempt.answer).toBe(beforeAttempt.answer);
    expect(afterAttempt.role).toBe(beforeAttempt.role);
    expect(afterAttempt.password).toBe(beforeAttempt.password);
  });

  /* =========================================================
     RESPONSE SECURITY / CONSISTENCY
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful login response never exposes password", async () => {
    await seedUser({
      email: "securelogin@test.com",
      plainPassword: "securePassword123",
    });

    const req = makeReq({
      email: "securelogin@test.com",
      password: "securePassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];

    expect(payload.user.password).toBeUndefined();
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful login response never exposes security answer", async () => {
    await seedUser({
      email: "noanswer@test.com",
      plainPassword: "answerPassword123",
      answer: "MySecretAnswer",
    });

    const req = makeReq({
      email: "noanswer@test.com",
      password: "answerPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];

    expect(payload.user.answer).toBeUndefined();
  });

  /* =========================================================
     TOKEN STRUCTURE / AUTH CHAIN
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('successful login generates a token whose payload matches the authenticated user and uses 7d expiry semantics', async () => {
    const { user } = await seedUser({
      email: "expiry@test.com",
      plainPassword: "expiryPassword123",
    });

    const req = makeReq({
      email: "expiry@test.com",
      password: "expiryPassword123",
    });
    const res = makeRes();

    await loginController(req, res);

    const payload = res.send.mock.calls[0][0];
    const decoded = JWT.verify(payload.token, process.env.JWT_SECRET);

    expect(String(decoded._id)).toBe(String(user._id));
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();

    // 7 days = 604800 seconds
    expect(decoded.exp - decoded.iat).toBe(60 * 60 * 24 * 7);
  });
});