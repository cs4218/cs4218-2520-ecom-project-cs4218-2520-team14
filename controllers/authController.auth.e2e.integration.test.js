//Name: Shauryan Agrawal
//Student ID: A0265846N

import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import authRoutes from "../routes/authRoute.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { comparePassword } from "../helpers/authHelper.js";

let mongoServer;
let app;


const authHeader = (token) => token;

const makeRegisterPayload = (overrides = {}) => ({
  name: "John Doe",
  email: "john@test.com",
  password: "pass123",
  phone: "1234567890",
  address: "Singapore",
  answer: "Football",
  ...overrides,
});

const makeLoginPayload = (overrides = {}) => ({
  email: "john@test.com",
  password: "pass123",
  ...overrides,
});

const makeForgotPasswordPayload = (overrides = {}) => ({
  email: "john@test.com",
  answer: "Football",
  newPassword: "newPass123",
  ...overrides,
});

const makeUpdateProfilePayload = (overrides = {}) => ({
  name: "John Updated",
  email: "newemail@test.com", // controller currently ignores email updates
  password: "updatedPass123",
  phone: "99999999",
  address: "Tampines",
  ...overrides,
});

const registerUserThroughRoute = async (payload) => {
  return request(app).post("/api/v1/auth/register").send(payload);
};

const loginUserThroughRoute = async (payload) => {
  return request(app).post("/api/v1/auth/login").send(payload);
};

describe("Complete Authentication E2E Integration Tests (real routes + middleware + JWT + DB)", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "auth-e2e-integration-secret";

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);
  });

  afterEach(async () => {
    await orderModel.deleteMany({});
    await userModel.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  /* =========================================================
     CORE USER LIFECYCLE:
     Register -> Login -> user-auth -> Update Profile
     -> old password fails -> new password works -> persisted
     ========================================================= */

     //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("completes the full normal-user authentication lifecycle end to end", async () => {
    const originalUser = makeRegisterPayload({
      name: "Alice",
      email: "alice@test.com",
      password: "alicePass123",
      phone: "88888888",
      address: "NUS",
      answer: "Blue",
    });

    // 1) Register
    const registerRes = await registerUserThroughRoute(originalUser);

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "User Register Successfully",
        user: expect.objectContaining({
          name: "Alice",
          email: "alice@test.com",
          phone: "88888888",
          address: "NUS",
          answer: "Blue",
          role: 0,
        }),
      })
    );
    expect(registerRes.body.user.password).toBeUndefined();

    // 2) Login
    const loginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "alice@test.com",
        password: "alicePass123",
      })
    );

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "login successfully",
        user: expect.objectContaining({
          name: "Alice",
          email: "alice@test.com",
          phone: "88888888",
          address: "NUS",
          role: 0,
        }),
        token: expect.any(String),
      })
    );
    expect(loginRes.body.user.password).toBeUndefined();
    expect(loginRes.body.user.answer).toBeUndefined();

    const token = loginRes.body.token;

    // 3) Access normal protected user route
    const userAuthRes = await request(app)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", authHeader(token));

    expect(userAuthRes.status).toBe(200);
    expect(userAuthRes.body).toEqual({ ok: true });

    // 4) Update profile with token
    const updateRes = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", authHeader(token))
      .send(
        makeUpdateProfilePayload({
          name: "Alice Updated",
          email: "alicechanged@test.com", // should remain unchanged by current controller logic
          password: "aliceNewPass123",
          phone: "77777777",
          address: "Tampines",
        })
      );

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: expect.objectContaining({
          name: "Alice Updated",
          email: "alice@test.com", // controller does not update email
          phone: "77777777",
          address: "Tampines",
          answer: "Blue",
          role: 0,
        }),
      })
    );

    // current controller returns updatedUser directly, so password is present
    expect(updateRes.body.updatedUser.password).toBeDefined();
    expect(updateRes.body.updatedUser.password).not.toBe("aliceNewPass123");

    // 5) Old password fails
    const oldLoginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "alice@test.com",
        password: "alicePass123",
      })
    );

    expect(oldLoginRes.status).toBe(401);
    expect(oldLoginRes.body).toEqual({
      success: false,
      message: "Invalid Password",
    });

    // 6) New password works
    const newLoginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "alice@test.com",
        password: "aliceNewPass123",
      })
    );

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body).toEqual(
      expect.objectContaining({
        success: true,
        message: "login successfully",
        user: expect.objectContaining({
          name: "Alice Updated",
          email: "alice@test.com",
          phone: "77777777",
          address: "Tampines",
          role: 0,
        }),
        token: expect.any(String),
      })
    );

    // 7) Final DB verification
    const persistedUser = await userModel.findOne({ email: "alice@test.com" });

    expect(persistedUser).not.toBeNull();
    expect(persistedUser.name).toBe("Alice Updated");
    expect(persistedUser.email).toBe("alice@test.com");
    expect(persistedUser.phone).toBe("77777777");
    expect(persistedUser.address).toBe("Tampines");
    expect(persistedUser.answer).toBe("Blue");
    expect(persistedUser.role).toBe(0);

    const newPasswordMatches = await comparePassword(
      "aliceNewPass123",
      persistedUser.password
    );
    expect(newPasswordMatches).toBe(true);
  });

  /* =========================================================
     PASSWORD RECOVERY LOOP:
     Register -> Forgot Password -> old login fails
     -> new login works -> user-auth works
     ========================================================= */

     //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("completes forgot-password recovery end to end", async () => {
    const user = makeRegisterPayload({
      name: "Bob",
      email: "bob@test.com",
      password: "bobOldPass123",
      phone: "66666666",
      address: "Jurong",
      answer: "Cricket",
    });

    const registerRes = await registerUserThroughRoute(user);
    expect(registerRes.status).toBe(201);

    const forgotRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send(
        makeForgotPasswordPayload({
          email: "bob@test.com",
          answer: "Cricket",
          newPassword: "bobNewPass123",
        })
      );

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body).toEqual({
      success: true,
      message: "Password Reset Successfully",
    });

    const oldLoginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "bob@test.com",
        password: "bobOldPass123",
      })
    );

    expect(oldLoginRes.status).toBe(401);
    expect(oldLoginRes.body).toEqual({
      success: false,
      message: "Invalid Password",
    });

    const newLoginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "bob@test.com",
        password: "bobNewPass123",
      })
    );

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
    expect(newLoginRes.body.message).toBe("login successfully");
    expect(newLoginRes.body.token).toEqual(expect.any(String));

    const userAuthRes = await request(app)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", authHeader(newLoginRes.body.token));

    expect(userAuthRes.status).toBe(200);
    expect(userAuthRes.body).toEqual({ ok: true });

    const persistedUser = await userModel.findOne({ email: "bob@test.com" });

    expect(persistedUser).not.toBeNull();

    const oldMatches = await comparePassword(
      "bobOldPass123",
      persistedUser.password
    );
    const newMatches = await comparePassword(
      "bobNewPass123",
      persistedUser.password
    );

    expect(oldMatches).toBe(false);
    expect(newMatches).toBe(true);
  });

  /* =========================================================
     PROFILE UPDATE VALIDATION
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("rejects profile update when authenticated user provides a password shorter than 6 characters", async () => {
    const user = makeRegisterPayload({
      name: "Carol",
      email: "carol@test.com",
      password: "carolPass123",
      phone: "55555555",
      address: "Pasir Ris",
      answer: "Tennis",
    });

    const registerRes = await registerUserThroughRoute(user);
    expect(registerRes.status).toBe(201);

    const loginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "carol@test.com",
        password: "carolPass123",
      })
    );
    expect(loginRes.status).toBe(200);

    const invalidUpdateRes = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", authHeader(loginRes.body.token))
      .send(
        makeUpdateProfilePayload({
          name: "Carol Updated",
          email: "carol@test.com",
          password: "123",
          phone: "44444444",
          address: "Yishun",
        })
      );

    // current controller uses res.json(...) and not res.status(400)
    expect(invalidUpdateRes.status).toBe(200);
    expect(invalidUpdateRes.body).toEqual({
      error: "Password is required and 6 character long",
    });

    const persistedUser = await userModel.findOne({ email: "carol@test.com" });

    expect(persistedUser).not.toBeNull();
    expect(persistedUser.name).toBe("Carol");
    expect(persistedUser.phone).toBe("55555555");
    expect(persistedUser.address).toBe("Pasir Ris");

    const oldPasswordStillWorks = await comparePassword(
      "carolPass123",
      persistedUser.password
    );
    expect(oldPasswordStillWorks).toBe(true);
  });

  /* =========================================================
     AUTH PROTECTION
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("rejects unauthenticated access to protected authentication routes", async () => {
    const userAuthRes = await request(app).get("/api/v1/auth/user-auth");
    expect([401, 403]).toContain(userAuthRes.status);

    const adminAuthRes = await request(app).get("/api/v1/auth/admin-auth");
    expect([401, 403]).toContain(adminAuthRes.status);

    const profileRes = await request(app)
      .put("/api/v1/auth/profile")
      .send(makeUpdateProfilePayload());
    expect([401, 403]).toContain(profileRes.status);

    const ordersRes = await request(app).get("/api/v1/auth/orders");
    expect([401, 403]).toContain(ordersRes.status);

    const allOrdersRes = await request(app).get("/api/v1/auth/all-orders");
    expect([401, 403]).toContain(allOrdersRes.status);

    const usersRes = await request(app).get("/api/v1/auth/users");
    expect([401, 403]).toContain(usersRes.status);

    const orderStatusRes = await request(app)
      .put("/api/v1/auth/order-status/507f1f77bcf86cd799439011")
      .send({ status: "Processing" });
    expect([401, 403]).toContain(orderStatusRes.status);

    const testRes = await request(app).get("/api/v1/auth/test");
    expect([401, 403]).toContain(testRes.status);
  });

  /* =========================================================
     NORMAL USER AUTHORIZATION
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("allows normal user access to user-auth but denies admin-only auth routes", async () => {
    const user = makeRegisterPayload({
      name: "Dave",
      email: "dave@test.com",
      password: "davePass123",
      phone: "33333333",
      address: "Bedok",
      answer: "Hockey",
    });

    const registerRes = await registerUserThroughRoute(user);
    expect(registerRes.status).toBe(201);

    const loginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "dave@test.com",
        password: "davePass123",
      })
    );
    expect(loginRes.status).toBe(200);

    const token = loginRes.body.token;

    const userAuthRes = await request(app)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", authHeader(token));

    expect(userAuthRes.status).toBe(200);
    expect(userAuthRes.body).toEqual({ ok: true });

    const adminAuthRes = await request(app)
      .get("/api/v1/auth/admin-auth")
      .set("Authorization", authHeader(token));

    expect([401, 403]).toContain(adminAuthRes.status);

    const testRes = await request(app)
      .get("/api/v1/auth/test")
      .set("Authorization", authHeader(token));

    expect([401, 403]).toContain(testRes.status);

    const usersRes = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", authHeader(token));

    expect([401, 403]).toContain(usersRes.status);

    const allOrdersRes = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", authHeader(token));

    expect([401, 403]).toContain(allOrdersRes.status);

    const orderStatusRes = await request(app)
      .put("/api/v1/auth/order-status/507f1f77bcf86cd799439011")
      .set("Authorization", authHeader(token))
      .send({ status: "Processing" });

    expect([401, 403]).toContain(orderStatusRes.status);
  });

  /* =========================================================
     ADMIN AUTHORIZATION
     Note: role elevation is done only in setup because there is
     no public admin-registration route in the real application.
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("allows admin user to access admin-only routes and returns sanitized user list", async () => {
    // create admin through real register route
    const adminRegisterRes = await registerUserThroughRoute(
      makeRegisterPayload({
        name: "Admin User",
        email: "admin@test.com",
        password: "adminPass123",
        phone: "11111111",
        address: "Orchard",
        answer: "AdminAnswer",
      })
    );

    expect(adminRegisterRes.status).toBe(201);

    // create normal user too, so admin list is meaningful
    const normalRegisterRes = await registerUserThroughRoute(
      makeRegisterPayload({
        name: "Regular User",
        email: "regular@test.com",
        password: "regularPass123",
        phone: "22222222",
        address: "Sengkang",
        answer: "RegularAnswer",
      })
    );

    expect(normalRegisterRes.status).toBe(201);

    // promote admin in setup only
    const adminUser = await userModel.findOneAndUpdate(
      { email: "admin@test.com" },
      { role: 1 },
      { new: true }
    );

    expect(adminUser.role).toBe(1);

    const adminLoginRes = await loginUserThroughRoute(
      makeLoginPayload({
        email: "admin@test.com",
        password: "adminPass123",
      })
    );

    expect(adminLoginRes.status).toBe(200);
    expect(adminLoginRes.body.user.role).toBe(1);

    const adminToken = adminLoginRes.body.token;

    const adminAuthRes = await request(app)
      .get("/api/v1/auth/admin-auth")
      .set("Authorization", authHeader(adminToken));

    expect(adminAuthRes.status).toBe(200);
    expect(adminAuthRes.body).toEqual({ ok: true });

    const testRes = await request(app)
      .get("/api/v1/auth/test")
      .set("Authorization", authHeader(adminToken));

    expect(testRes.status).toBe(200);
    expect(testRes.text).toBe("Protected Routes");

    const usersRes = await request(app)
      .get("/api/v1/auth/users")
      .set("Authorization", authHeader(adminToken));

    expect(usersRes.status).toBe(200);
    expect(Array.isArray(usersRes.body)).toBe(true);
    expect(usersRes.body).toHaveLength(2);

    for (const user of usersRes.body) {
      expect(user.password).toBeUndefined();
    }

    const returnedEmails = usersRes.body.map((u) => u.email);
    expect(returnedEmails).toEqual(
      expect.arrayContaining(["admin@test.com", "regular@test.com"])
    );

    const allOrdersRes = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", authHeader(adminToken));

    expect(allOrdersRes.status).toBe(200);
    expect(Array.isArray(allOrdersRes.body)).toBe(true);
    expect(allOrdersRes.body).toHaveLength(0);
  });

  /* =========================================================
     REGISTER / LOGIN / FORGOT BRANCHES AT ROUTE LEVEL
     ========================================================= */
//Name: Shauryan Agrawal
//Student ID: A0265846N
  it("prevents duplicate registration through the real register route", async () => {
    const user = makeRegisterPayload({
      name: "Duplicate User",
      email: "duplicate@test.com",
      password: "duplicatePass123",
      phone: "12121212",
      address: "Bishan",
      answer: "Chess",
    });

    const firstRegisterRes = await registerUserThroughRoute(user);
    expect(firstRegisterRes.status).toBe(201);

    const secondRegisterRes = await registerUserThroughRoute(user);
    expect(secondRegisterRes.status).toBe(409);
    expect(secondRegisterRes.body).toEqual({
      success: false,
      message: "Already Register please login",
    });

    const users = await userModel.find({ email: "duplicate@test.com" });
    expect(users).toHaveLength(1);
  });

  it("rejects login with missing credentials through the real login route", async () => {
    const missingEmailRes = await loginUserThroughRoute({
      email: "",
      password: "somePassword123",
    });

    expect(missingEmailRes.status).toBe(400);
    expect(missingEmailRes.body).toEqual({
      success: false,
      message: "Invalid email or password",
    });

    const missingPasswordRes = await loginUserThroughRoute({
      email: "john@test.com",
      password: "",
    });

    expect(missingPasswordRes.status).toBe(400);
    expect(missingPasswordRes.body).toEqual({
      success: false,
      message: "Invalid email or password",
    });
  });

  it("rejects forgot-password with wrong email-answer combination through the real route", async () => {
    const registerRes = await registerUserThroughRoute(
      makeRegisterPayload({
        name: "Forgot User",
        email: "forgot@test.com",
        password: "forgotPass123",
        phone: "23232323",
        address: "Hougang",
        answer: "CorrectAnswer",
      })
    );

    expect(registerRes.status).toBe(201);

    const forgotRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send(
        makeForgotPasswordPayload({
          email: "forgot@test.com",
          answer: "WrongAnswer",
          newPassword: "newForgotPass123",
        })
      );

    expect(forgotRes.status).toBe(404);
    expect(forgotRes.body).toEqual({
      success: false,
      message: "Wrong Email Or Answer",
    });

    const persistedUser = await userModel.findOne({ email: "forgot@test.com" });
    const oldPasswordStillMatches = await comparePassword(
      "forgotPass123",
      persistedUser.password
    );

    expect(oldPasswordStillMatches).toBe(true);
  });
});