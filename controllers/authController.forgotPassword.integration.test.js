//Name: Shauryan Agrawal
//Student ID: A0265846N

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { forgotPasswordController } from "./authController.js";
import userModel from "../models/userModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";

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
    answer: "Football",
    newPassword: "newPass123",
    ...bodyOverrides,
  },
});

const seedUser = async (overrides = {}) => {
  const plainPassword = overrides.plainPassword || "oldPassword123";
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

describe("forgotPasswordController integration tests (real DB + real helper + real model)", () => {
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
  it('valid forgot-password request returns HTTP 200 with message "Password Reset Successfully"', async () => {
    await seedUser({
      email: "reset@test.com",
      answer: "Blue",
      plainPassword: "oldPassword123",
    });

    const req = makeReq({
      email: "reset@test.com",
      answer: "Blue",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Password Reset Successfully",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful password reset updates the persisted password in the database", async () => {
    const { user } = await seedUser({
      email: "update@test.com",
      answer: "Chess",
      plainPassword: "oldPassword123",
    });

    const beforeReset = await userModel.findById(user._id);

    const req = makeReq({
      email: "update@test.com",
      answer: "Chess",
      newPassword: "brandNewPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const afterReset = await userModel.findById(user._id);

    expect(afterReset).not.toBeNull();
    expect(afterReset.password).toBeDefined();
    expect(afterReset.password).not.toBe(beforeReset.password);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful password reset stores a hashed password, not the raw new password", async () => {
    await seedUser({
      email: "hashreset@test.com",
      answer: "Red",
      plainPassword: "oldPassword123",
    });

    const req = makeReq({
      email: "hashreset@test.com",
      answer: "Red",
      newPassword: "myRawNewPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const updatedUser = await userModel.findOne({ email: "hashreset@test.com" });

    expect(updatedUser).not.toBeNull();
    expect(updatedUser.password).toBeDefined();
    expect(updatedUser.password).not.toBe("myRawNewPassword123");
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful password reset stores a password verifiable by the real comparePassword helper", async () => {
    await seedUser({
      email: "verifyreset@test.com",
      answer: "Green",
      plainPassword: "oldPassword123",
    });

    const req = makeReq({
      email: "verifyreset@test.com",
      answer: "Green",
      newPassword: "verifiedNewPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const updatedUser = await userModel.findOne({ email: "verifyreset@test.com" });

    expect(updatedUser).not.toBeNull();

    const isMatch = await comparePassword(
      "verifiedNewPassword123",
      updatedUser.password
    );

    expect(isMatch).toBe(true);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful password reset invalidates the old password hash semantically", async () => {
    await seedUser({
      email: "oldinvalid@test.com",
      answer: "Yellow",
      plainPassword: "oldPassword123",
    });

    const req = makeReq({
      email: "oldinvalid@test.com",
      answer: "Yellow",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const updatedUser = await userModel.findOne({ email: "oldinvalid@test.com" });

    expect(updatedUser).not.toBeNull();

    const oldPasswordStillMatches = await comparePassword(
      "oldPassword123",
      updatedUser.password
    );
    const newPasswordMatches = await comparePassword(
      "newPassword123",
      updatedUser.password
    );

    expect(oldPasswordStillMatches).toBe(false);
    expect(newPasswordMatches).toBe(true);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful password reset preserves all non-password fields of the user", async () => {
    const { user } = await seedUser({
      name: "Preserved User",
      email: "preservefields@test.com",
      answer: "Purple",
      plainPassword: "oldPassword123",
      phone: "99999999",
      address: "Tampines",
      role: 0,
    });

    const beforeReset = await userModel.findById(user._id);

    const req = makeReq({
      email: "preservefields@test.com",
      answer: "Purple",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const afterReset = await userModel.findById(user._id);

    expect(afterReset).not.toBeNull();
    expect(afterReset.name).toBe(beforeReset.name);
    expect(afterReset.email).toBe(beforeReset.email);
    expect(afterReset.phone).toBe(beforeReset.phone);
    expect(afterReset.address).toBe(beforeReset.address);
    expect(afterReset.answer).toBe(beforeReset.answer);
    expect(afterReset.role).toBe(beforeReset.role);
  });

  /* =========================================================
     VALIDATION BRANCHES
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing email returns HTTP 400 with message "Email is required"', async () => {
    const req = makeReq({
      email: "",
      answer: "Football",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Email is required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing answer returns HTTP 400 with message "answer is required"', async () => {
    const req = makeReq({
      email: "john@test.com",
      answer: "",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "answer is required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('missing newPassword returns HTTP 400 with message "New Password is required"', async () => {
    const req = makeReq({
      email: "john@test.com",
      answer: "Football",
      newPassword: "",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "New Password is required",
    });

    const users = await userModel.find({});
    expect(users).toHaveLength(0);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("validation failure does not update any persisted user password", async () => {
    const { user } = await seedUser({
      email: "novalidupdate@test.com",
      answer: "Orange",
      plainPassword: "oldPassword123",
    });

    const beforeAttempt = await userModel.findById(user._id);

    const req = makeReq({
      email: "novalidupdate@test.com",
      answer: "Orange",
      newPassword: "",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const afterAttempt = await userModel.findById(user._id);

    expect(afterAttempt).not.toBeNull();
    expect(afterAttempt.password).toBe(beforeAttempt.password);
  });

  /* =========================================================
     USER NOT FOUND / WRONG ANSWER
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('unknown email returns HTTP 404 with message "Wrong Email Or Answer"', async () => {
    const req = makeReq({
      email: "nouser@test.com",
      answer: "Football",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Wrong Email Or Answer",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it('wrong security answer returns HTTP 404 with message "Wrong Email Or Answer"', async () => {
    await seedUser({
      email: "wronganswer@test.com",
      answer: "CorrectAnswer",
      plainPassword: "oldPassword123",
    });

    const req = makeReq({
      email: "wronganswer@test.com",
      answer: "WrongAnswer",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Wrong Email Or Answer",
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("wrong email or answer does not modify the original persisted password", async () => {
    const { user } = await seedUser({
      email: "nomutate@test.com",
      answer: "CorrectAnswer",
      plainPassword: "oldPassword123",
    });

    const beforeAttempt = await userModel.findById(user._id);

    const req = makeReq({
      email: "nomutate@test.com",
      answer: "WrongAnswer",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const afterAttempt = await userModel.findById(user._id);

    expect(afterAttempt).not.toBeNull();
    expect(afterAttempt.password).toBe(beforeAttempt.password);
  });

  /* =========================================================
     CONSISTENCY / ATOMICITY
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("password reset changes only one matching user record", async () => {
    await seedUser({
      name: "User One",
      email: "userone@test.com",
      answer: "AnswerOne",
      plainPassword: "passwordOne123",
    });

    await seedUser({
      name: "User Two",
      email: "usertwo@test.com",
      answer: "AnswerTwo",
      plainPassword: "passwordTwo123",
    });

    const beforeUserTwo = await userModel.findOne({ email: "usertwo@test.com" });

    const req = makeReq({
      email: "userone@test.com",
      answer: "AnswerOne",
      newPassword: "newPasswordForUserOne123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const afterUserOne = await userModel.findOne({ email: "userone@test.com" });
    const afterUserTwo = await userModel.findOne({ email: "usertwo@test.com" });

    const userOneMatchesNewPassword = await comparePassword(
      "newPasswordForUserOne123",
      afterUserOne.password
    );

    expect(userOneMatchesNewPassword).toBe(true);
    expect(afterUserTwo.password).toBe(beforeUserTwo.password);
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("successful password reset does not create or delete any user records", async () => {
    await seedUser({
      email: "countreset@test.com",
      answer: "Silver",
      plainPassword: "oldPassword123",
    });

    const countBefore = await userModel.countDocuments();

    const req = makeReq({
      email: "countreset@test.com",
      answer: "Silver",
      newPassword: "newPassword123",
    });
    const res = makeRes();

    await forgotPasswordController(req, res);

    const countAfter = await userModel.countDocuments();

    expect(countAfter).toBe(countBefore);
  });
});