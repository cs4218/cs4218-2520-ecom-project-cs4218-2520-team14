//Name: Shauryan Agrawal
//Student ID: A0265846N

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { registerController } from "./authController.js";
import userModel from "../models/userModel.js";
import { comparePassword } from "../helpers/authHelper.js";

let mongoServer;

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (bodyOverrides = {}) => ({
  body: {
    name: "John Doe",
    email: "john@test.com",
    password: "pass123",
    phone: "1234567890",
    address: "Singapore",
    answer: "Football",
    ...bodyOverrides,
  },
});

describe("registerController integration tests (real DB + real helper + real model)", () => {
  beforeAll(async () => {
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
  it('valid registration returns HTTP 201, success true, and message "User Register Successfully"', async () => {
    const req = makeReq();
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "User Register Successfully",
        user: expect.any(Object),
      })
    );
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("response includes sanitized user object with expected fields and persisted identity", async () => {
    const req = makeReq({
      name: "Alice",
      email: "alice@test.com",
      phone: "88888888",
      address: "NUS",
      answer: "Blue",
    });
    const res = makeRes();

    await registerController(req, res);

    const payload = res.send.mock.calls[0][0];
    const dbUser = await userModel.findOne({ email: "alice@test.com" });

    expect(payload.user).toEqual(
      expect.objectContaining({
        _id: expect.anything(),
        name: "Alice",
        email: "alice@test.com",
        phone: "88888888",
        address: "NUS",
        answer: "Blue",
        role: 0,
      })
    );

    expect(payload.user.password).toBeUndefined();

    expect(dbUser).not.toBeNull();
    expect(String(payload.user._id)).toBe(String(dbUser._id));
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("response does not expose password at all", async () => {
    const req = makeReq({
      email: "security@test.com",
      password: "plainPassword123",
    });
    const res = makeRes();

    await registerController(req, res);

    const payload = res.send.mock.calls[0][0];

    expect(payload.user.password).toBeUndefined();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("persists the user record in the in-memory MongoDB database", async () => {
    const req = makeReq({
      name: "Persisted User",
      email: "persist@test.com",
      password: "persist123",
      phone: "99999999",
      address: "Clementi",
      answer: "Chess",
    });
    const res = makeRes();

    await registerController(req, res);

    const savedUser = await userModel.findOne({ email: "persist@test.com" });

    expect(savedUser).not.toBeNull();
    expect(savedUser.name).toBe("Persisted User");
    expect(savedUser.email).toBe("persist@test.com");
    expect(savedUser.phone).toBe("99999999");
    expect(savedUser.address).toBe("Clementi");
    expect(savedUser.answer).toBe("Chess");
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("stores a hashed password in the database, not the raw password", async () => {
    const req = makeReq({
      email: "hashcheck@test.com",
      password: "rawPassword123",
    });
    const res = makeRes();

    await registerController(req, res);

    const savedUser = await userModel.findOne({ email: "hashcheck@test.com" });

    expect(savedUser).not.toBeNull();
    expect(savedUser.password).toBeDefined();
    expect(savedUser.password).not.toBe("rawPassword123");
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("stores a bcrypt-hashed password format in the database", async () => {
    const req = makeReq({
      email: "bcryptformat@test.com",
      password: "rawPassword123",
    });
    const res = makeRes();

    await registerController(req, res);

    const savedUser = await userModel.findOne({ email: "bcryptformat@test.com" });

    expect(savedUser).not.toBeNull();
    expect(savedUser.password).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("stores a password that can be verified by the real comparePassword helper", async () => {
    const req = makeReq({
      email: "helperchain@test.com",
      password: "securePassword123",
    });
    const res = makeRes();

    await registerController(req, res);

    const savedUser = await userModel.findOne({ email: "helperchain@test.com" });

    expect(savedUser).not.toBeNull();

    const isMatch = await comparePassword("securePassword123", savedUser.password);
    expect(isMatch).toBe(true);
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("newly persisted user gets default role 0 from schema", async () => {
    const req = makeReq({ email: "role@test.com" });
    const res = makeRes();

    await registerController(req, res);

    const savedUser = await userModel.findOne({ email: "role@test.com" });

    expect(savedUser).not.toBeNull();
    expect(savedUser.role).toBe(0);
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful response user matches the persisted database user on key fields", async () => {
    const req = makeReq({
      name: "Match User",
      email: "match@test.com",
      phone: "77777777",
      address: "Tampines",
      answer: "Football",
    });
    const res = makeRes();

    await registerController(req, res);

    const payload = res.send.mock.calls[0][0];
    const dbUser = await userModel.findOne({ email: "match@test.com" });

    expect(dbUser).not.toBeNull();

    expect(payload.user.name).toBe(dbUser.name);
    expect(payload.user.email).toBe(dbUser.email);
    expect(payload.user.phone).toBe(dbUser.phone);
    expect(payload.user.address).toBe(dbUser.address);
    expect(payload.user.answer).toBe(dbUser.answer);
    expect(payload.user.role).toBe(dbUser.role);
  });

  /* =========================================================
     DUPLICATE REGISTRATION
     ========================================================= */

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('attempting to register with an existing email returns success false and message "Already Register please login"', async () => {
    const firstReq = makeReq({ email: "duplicate@test.com" });
    const firstRes = makeRes();

    await registerController(firstReq, firstRes);

    const secondReq = makeReq({ email: "duplicate@test.com" });
    const secondRes = makeRes();

    await registerController(secondReq, secondRes);

    expect(secondRes.status).toHaveBeenCalledTimes(1);
    expect(secondRes.status).toHaveBeenCalledWith(409);

    expect(secondRes.send).toHaveBeenCalledTimes(1);
    expect(secondRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Already Register please login",
    });
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("duplicate registration does not create a second user record", async () => {
    const req1 = makeReq({ email: "single@test.com" });
    const res1 = makeRes();
    await registerController(req1, res1);

    const req2 = makeReq({ email: "single@test.com" });
    const res2 = makeRes();
    await registerController(req2, res2);

    const users = await userModel.find({ email: "single@test.com" });
    expect(users).toHaveLength(1);
  });

  /* =========================================================
     VALIDATION BRANCHES
     ========================================================= */

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing required name returns validation error "Name is Required"', async () => {
    const req = makeReq({ name: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is Required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing required email returns validation error "Email is Required"', async () => {
    const req = makeReq({ email: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Email is Required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing required password returns validation error "Password is Required"', async () => {
    const req = makeReq({ password: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Password is Required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing required phone returns validation error "Phone no is Required"', async () => {
    const req = makeReq({ phone: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Phone no is Required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing required address returns validation error "Address is Required"', async () => {
    const req = makeReq({ address: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Address is Required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing required answer returns validation error "Answer is Required"', async () => {
    const req = makeReq({ answer: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Answer is Required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

  /* =========================================================
     ATOMICITY / CONSISTENCY
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("validation failure does not persist any partial user record", async () => {
    const req = makeReq({ password: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });

//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("failed duplicate registration preserves the original persisted user data", async () => {
    const originalReq = makeReq({
      email: "preserve@test.com",
      name: "Original User",
      phone: "11111111",
    });
    await registerController(originalReq, makeRes());

    const duplicateReq = makeReq({
      email: "preserve@test.com",
      name: "Malicious Override",
      phone: "99999999",
    });
    await registerController(duplicateReq, makeRes());

    const users = await userModel.find({ email: "preserve@test.com" });
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Original User");
    expect(users[0].phone).toBe("11111111");
  });
});