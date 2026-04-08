import { registerController, loginController, forgotPasswordController, testController, updateProfileController, getOrdersController, getAllOrdersController, orderStatusController, getAllUsersController } from '../controllers/authController';
import userModel from '../models/userModel';
import orderModel from '../models/orderModel';
import { comparePassword, hashPassword } from './../helpers/authHelper';
import JWT from 'jsonwebtoken';

// Mock models
jest.mock('../models/userModel');
jest.mock('../models/orderModel');

// Mock helpers
jest.mock('./../helpers/authHelper');

// Mock JWT
const mockSign = jest.spyOn(JWT, 'sign');

// Mock environment variables
const mockJwtSecret = 'testsecret';
process.env.JWT_SECRET = mockJwtSecret;

describe('Auth Controllers', () => {
  let mockRequest;
  let mockResponse;
  let responseJsonSpy;
  let responseStatusSpy;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request and response objects
    mockRequest = {
      body: {},
      user: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn(),
      send: jest.fn(),
      json: jest.fn(),
    };
    responseStatusSpy = jest.spyOn(mockResponse, 'status');
    responseJsonSpy = jest.spyOn(mockResponse, 'json');

    // Default mock implementations
    userModel.findOne.mockResolvedValue(null);
    userModel.mockClear(); // Clear constructor mock
    userModel.prototype.save.mockClear();
    hashPassword.mockImplementation(async (password) => `hashed_${password}`);
    comparePassword.mockImplementation(async (plain, hashed) => plain === 'password');
    JWT.sign.mockReturnValue('mockToken');
    orderModel.find.mockResolvedValue([]);
    orderModel.populate.mockReturnThis();
    orderModel.findByIdAndUpdate.mockResolvedValue({ _id: 'order123', status: 'Shipped' });
    userModel.findByIdAndUpdate.mockResolvedValue({ _id: 'user123', name: 'Updated User' });
    userModel.findById.mockResolvedValue({ _id: 'user123', name: 'Test User', email: 'test@example.com', password: 'hashed_password', phone: '1234567890', address: '123 Main St' });
    userModel.select.mockReturnThis();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerController', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password',
      phone: '1234567890',
      address: '123 Main St',
      answer: 'secret answer',
    };

    it('should register a new user successfully', async () => {
      mockRequest.body = validUserData;
      userModel.findOne.mockResolvedValue(null);
      const newUser = { ...validUserData, _id: 'user123', password: 'hashed_password', role: 0 };
      userModel.mockImplementation(() => ({ ...newUser, save: jest.fn().mockResolvedValue(newUser) }));

      await registerController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(201);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User Register Successfully',
        user: expect.objectContaining({
          _id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
        }),
      });
      expect(hashPassword).toHaveBeenCalledWith('password');
      expect(userModel).toHaveBeenCalledTimes(1);
      expect(userModel.prototype.save).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if name is missing', async () => {
      mockRequest.body = { ...validUserData, name: '' };
      await registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Name is Required',
      });
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = { ...validUserData, email: '' };
      await registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Email is Required',
      });
    });

    it('should return 400 if password is missing', async () => {
      mockRequest.body = { ...validUserData, password: '' };
      await registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Password is Required',
      });
    });

    it('should return 400 if phone is missing', async () => {
      mockRequest.body = { ...validUserData, phone: '' };
      await registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Phone no is Required',
      });
    });

    it('should return 400 if address is missing', async () => {
      mockRequest.body = { ...validUserData, address: '' };
      await registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Address is Required',
      });
    });

    it('should return 400 if answer is missing', async () => {
      mockRequest.body = { ...validUserData, answer: '' };
      await registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Answer is Required',
      });
    });

    it('should return 409 if user already exists', async () => {
      mockRequest.body = validUserData;
      userModel.findOne.mockResolvedValue({ _id: 'existingUser', email: 'test@example.com' });

      await registerController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(409);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Already Register please login',
      });
    });

    it('should return 500 if there is a server error', async () => {
      mockRequest.body = validUserData;
      userModel.findOne.mockRejectedValue(new Error('Database error'));

      await registerController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error in Registration',
        error: 'Database error',
      });
    });
  });

  describe('loginController', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password',
    };

    it('should log in a user successfully', async () => {
      mockRequest.body = loginData;
      const mockUser = { _id: 'user123', name: 'Test User', email: 'test@example.com', password: 'hashed_password', role: 0 };
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);

      await loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'login successfully',
        user: expect.objectContaining({
          _id: 'user123',
          name: 'Test User',
        }),
        token: 'mockToken',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(comparePassword).toHaveBeenCalledWith('password', 'hashed_password');
      expect(mockSign).toHaveBeenCalledWith({ _id: 'user123' }, mockJwtSecret, { expiresIn: '7d' });
    });

    it('should return 400 if email or password is missing', async () => {
      mockRequest.body = { email: 'test@example.com' };
      await loginController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should return 404 if user is not found', async () => {
      mockRequest.body = loginData;
      userModel.findOne.mockResolvedValue(null);

      await loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(404);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Email is not registerd',
      });
    });

    it('should return 401 if the password does not match', async () => {
      mockRequest.body = loginData;
      const mockUser = { _id: 'user123', email: 'test@example.com', password: 'hashed_password' };
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      await loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(401);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid Password',
      });
    });

    it('should return 500 if there is a server error', async () => {
      mockRequest.body = loginData;
      userModel.findOne.mockRejectedValue(new Error('Database error'));

      await loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error in login',
        error: 'Database error',
      });
    });
  });

  describe('forgotPasswordController', () => {
    const forgotPasswordData = {
      email: 'test@example.com',
      answer: 'secret answer',
      newPassword: 'newSecurePassword',
    };

    it('should reset the password successfully', async () => {
      mockRequest.body = forgotPasswordData;
      const mockUser = { _id: 'user123', email: 'test@example.com', answer: 'secret answer', password: 'hashed_old_password' };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue('hashed_new_password');
      userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser, password: 'hashed_new_password' });

      await forgotPasswordController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Password Reset Successfully',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com', answer: 'secret answer' });
      expect(hashPassword).toHaveBeenCalledWith('newSecurePassword');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', { password: 'hashed_new_password' });
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = { ...forgotPasswordData, email: '' };
      await forgotPasswordController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({ message: 'Email is required' });
    });

    it('should return 400 if answer is missing', async () => {
      mockRequest.body = { ...forgotPasswordData, answer: '' };
      await forgotPasswordController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({ message: 'answer is required' });
    });

    it('should return 400 if newPassword is missing', async () => {
      mockRequest.body = { ...forgotPasswordData, newPassword: '' };
      await forgotPasswordController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({ message: 'New Password is required' });
    });

    it('should return 404 if wrong email or answer', async () => {
      mockRequest.body = forgotPasswordData;
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(404);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Wrong Email Or Answer',
      });
    });

    it('should return 500 if there is a server error', async () => {
      mockRequest.body = forgotPasswordData;
      userModel.findOne.mockRejectedValue(new Error('Database error'));

      await forgotPasswordController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong',
        error: expect.any(Error),
      });
    });
  });

  describe('testController', () => {
    it('should return a success message', async () => {
      await testController(mockRequest, mockResponse);
      expect(mockResponse.send).toHaveBeenCalledWith('Protected Routes');
    });
  });

  describe('updateProfileController', () => {
    const userId = 'user123';

    beforeEach(() => {
      mockRequest.user = { _id: userId };
      userModel.findById.mockResolvedValue({ _id: userId, name: 'Original Name', email: 'original@example.com', password: 'hashed_original_password', phone: '1111111111', address: 'Original Address' });
      userModel.findByIdAndUpdate.mockResolvedValue({ _id: userId, name: 'Updated Name', phone: '2222222222', address: 'Updated Address' });
    });

    it('should update user profile successfully with new details', async () => {
      mockRequest.body = {
        name: 'Updated Name',
        phone: '2222222222',
        address: 'Updated Address',
      };
      await updateProfileController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Profile Updated Successfully',
        updatedUser: expect.objectContaining({
          _id: userId,
          name: 'Updated Name',
          phone: '2222222222',
          address: 'Updated Address',
        }),
      }));
      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, expect.objectContaining({
        name: 'Updated Name',
        phone: '2222222222',
        address: 'Updated Address',
      }), { new: true });
    });

    it('should update user profile with a new password', async () => {
      mockRequest.body = { password: 'newPassword123' };
      hashPassword.mockResolvedValue('hashed_new_password');
      userModel.findByIdAndUpdate.mockResolvedValue({ _id: userId, password: 'hashed_new_password' });

      await updateProfileController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, expect.objectContaining({ password: 'hashed_new_password' }), { new: true });
    });

    it('should return error if password is less than 6 characters', async () => {
      mockRequest.body = { password: 'short' };
      await updateProfileController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Profile',
        error: expect.objectContaining({ message: 'Password is required and 6 character long' }),
      });
    });

    it('should update profile with only provided fields', async () => {
      mockRequest.body = { name: 'Only Name Updated' };
      await updateProfileController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, expect.objectContaining({ name: 'Only Name Updated' }), { new: true });
    });

    it('should return 500 on server error during update', async () => {
      mockRequest.body = { name: 'Updated Name' };
      userModel.findByIdAndUpdate.mockRejectedValue(new Error('DB update error'));

      await updateProfileController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Profile',
        error: expect.any(Error),
      });
    });
  });

  describe('getOrdersController', () => {
    const userId = 'user123';

    beforeEach(() => {
      mockRequest.user = { _id: userId };
    });

    it('should get orders for the logged-in user', async () => {
      const mockOrders = [{ _id: 'order1', buyer: userId, products: ['prod1'] }];
      orderModel.find.mockResolvedValue(mockOrders);
      orderModel.populate.mockReturnThis(); // Mocking chaining

      await getOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).not.toHaveBeenCalled(); // Expecting direct json
      expect(responseJsonSpy).toHaveBeenCalledWith(mockOrders);
      expect(orderModel.find).toHaveBeenCalledWith({ buyer: userId });
      expect(orderModel.populate).toHaveBeenCalledTimes(2);
    });

    it('should return 500 if there is a server error', async () => {
      orderModel.find.mockRejectedValue(new Error('Database error'));

      await getOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: expect.any(Error),
      });
    });
  });

  describe('getAllOrdersController', () => {
    it('should get all orders', async () => {
      const mockOrders = [{ _id: 'order1', buyer: 'user1', products: ['prod1'] }, { _id: 'order2', buyer: 'user2', products: ['prod2'] }];
      orderModel.find.mockResolvedValue(mockOrders);
      orderModel.populate.mockReturnThis(); // Mocking chaining

      await getAllOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).not.toHaveBeenCalled();
      expect(responseJsonSpy).toHaveBeenCalledWith(mockOrders);
      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(orderModel.populate).toHaveBeenCalledTimes(2);
      expect(orderModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return 500 if there is a server error', async () => {
      orderModel.find.mockRejectedValue(new Error('Database error'));

      await getAllOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: expect.any(Error),
      });
    });
  });

  describe('orderStatusController', () => {
    const orderId = 'order123';
    const status = 'Shipped';

    beforeEach(() => {
      mockRequest.params.orderId = orderId;
      mockRequest.body.status = status;
      orderModel.findByIdAndUpdate.mockResolvedValue({ _id: orderId, status: status });
    });

    it('should update the status of an order', async () => {
      await orderStatusController(mockRequest, mockResponse);
      expect(responseStatusSpy).not.toHaveBeenCalled();
      expect(responseJsonSpy).toHaveBeenCalledWith({ _id: orderId, status: status });
      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(orderId, { status: status }, { new: true });
    });

    it('should return 500 if there is a server error', async () => {
      orderModel.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await orderStatusController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Order',
        error: expect.any(Error),
      });
    });
  });

  describe('getAllUsersController', () => {
    it('should get all users', async () => {
      const mockUsers = [{ _id: 'user1', name: 'User One' }, { _id: 'user2', name: 'User Two' }];
      userModel.find.mockResolvedValue(mockUsers);
      userModel.select.mockReturnThis(); // Mocking chaining

      await getAllUsersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith(mockUsers);
      expect(userModel.find).toHaveBeenCalledWith({});
      expect(userModel.select).toHaveBeenCalledWith('-password');
      expect(userModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return 500 if there is a server error', async () => {
      userModel.find.mockRejectedValue(new Error('Database error'));

      await getAllUsersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error while getting users',
        error: expect.any(Error),
      });
    });
  });
});