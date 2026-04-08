import { registerController } from '../controllers/authController';
import userModel from '../models/userModel';
import { hashPassword, comparePassword } from '../helpers/authHelper';
import JWT from 'jsonwebtoken';

// Mock models and helpers
jest.mock('../models/userModel');
jest.mock('../helpers/authHelper');
jest.mock('jsonwebtoken');

// Mock JWT secret
const JWT_SECRET = 'testsecret';
process.env.JWT_SECRET = JWT_SECRET;

describe('Auth Controller', () => {
  let mockRequest;
  let mockResponse;
  let sendSpy;
  let statusSpy;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request and response objects
    mockRequest = {
      body: {},
      user: { _id: 'mockUserId' }, // Mock user for authenticated routes
    };
    mockResponse = {};
    statusSpy = jest.fn().mockReturnValue(mockResponse);
    sendSpy = jest.fn();
    mockResponse.status = statusSpy;
    mockResponse.send = sendSpy;
  });

  describe('registerController', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        _id: 'newUserId',
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main St',
        answer: 'secret answer',
      };
      userModel.findOne.mockResolvedValue(null); // No existing user
      hashPassword.mockResolvedValue('hashedPassword');
      userModel.prototype.save.mockResolvedValue(newUser);

      mockRequest.body = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        address: newUser.address,
        answer: newUser.answer,
      };

      await registerController(mockRequest, mockResponse);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: newUser.email });
      expect(hashPassword).toHaveBeenCalledWith(newUser.password);
      expect(userModel).toHaveBeenCalledWith(expect.objectContaining({
        name: newUser.name,
        email: newUser.email,
        password: 'hashedPassword',
        phone: newUser.phone,
        address: newUser.address,
        answer: newUser.answer,
      }));
      expect(userModel.prototype.save).toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(sendSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User Register Successfully',
        user: expect.objectContaining({
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          address: newUser.address,
          answer: newUser.answer,
          role: expect.any(Number), // Assuming default role is a number
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should return 409 if user already exists', async () => {
      const existingUser = {
        _id: 'existingUserId',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: 'hashedPassword',
        phone: '0987654321',
        address: '456 Oak Ave',
        answer: 'another answer',
      };
      userModel.findOne.mockResolvedValue(existingUser);

      mockRequest.body = {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: 'password123',
        phone: '0987654321',
        address: '456 Oak Ave',
        answer: 'another answer',
      };

      await registerController(mockRequest, mockResponse);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'jane.doe@example.com' });
      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Already Register please login',
      });
    });

    it('should return 400 for missing name', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password',
        phone: '12345',
        address: 'address',
        answer: 'answer',
      };
      await registerController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Name is Required',
      });
    });

    it('should return 400 for missing email', async () => {
      mockRequest.body = {
        name: 'Test User',
        password: 'password',
        phone: '12345',
        address: 'address',
        answer: 'answer',
      };
      await registerController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Email is Required',
      });
    });

    it('should return 400 for missing password', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '12345',
        address: 'address',
        answer: 'answer',
      };
      await registerController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Password is Required',
      });
    });

    it('should return 400 for missing phone', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        address: 'address',
        answer: 'answer',
      };
      await registerController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Phone no is Required',
      });
    });

    it('should return 400 for missing address', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        phone: '12345',
        answer: 'answer',
      };
      await registerController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Address is Required',
      });
    });

    it('should return 400 for missing answer', async () => {
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        phone: '12345',
        address: 'address',
      };
      await registerController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Answer is Required',
      });
    });

    it('should handle internal server errors during registration', async () => {
      userModel.findOne.mockRejectedValue(new Error('Database error'));
      mockRequest.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        phone: '12345',
        address: 'address',
        answer: 'answer',
      };

      await registerController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error in Registration',
        error: 'Database error',
      });
    });
  });

  describe('loginController', () => {
    const user = {
      _id: 'userId',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword',
      phone: '1234567890',
      address: '123 Main St',
      role: 0,
    };

    it('should login a user successfully', async () => {
      userModel.findOne.mockResolvedValue(user);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue('mockToken');

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password',
      };

      await loginController(mockRequest, mockResponse);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(comparePassword).toHaveBeenCalledWith('password', 'hashedPassword');
      expect(JWT.sign).toHaveBeenCalledWith({ _id: user._id }, JWT_SECRET, { expiresIn: '7d' });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(sendSpy).toHaveBeenCalledWith({
        success: true,
        message: 'login successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
        },
        token: 'mockToken',
      });
    });

    it('should return 400 for missing email or password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };
      await loginController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should return 404 if user is not registered', async () => {
      userModel.findOne.mockResolvedValue(null);
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      await loginController(mockRequest, mockResponse);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Email is not registerd',
      });
    });

    it('should return 401 for invalid password', async () => {
      userModel.findOne.mockResolvedValue(user);
      comparePassword.mockResolvedValue(false);
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      await loginController(mockRequest, mockResponse);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(comparePassword).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid Password',
      });
    });

    it('should handle internal server errors during login', async () => {
      userModel.findOne.mockRejectedValue(new Error('Database error'));
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password',
      };

      await loginController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error in login',
        error: 'Database error',
      });
    });
  });

  describe('forgotPasswordController', () => {
    const user = {
      _id: 'userId',
      email: 'test@example.com',
      answer: 'secret answer',
      password: 'oldHashedPassword',
    };

    it('should reset password successfully', async () => {
      userModel.findOne.mockResolvedValue(user);
      hashPassword.mockResolvedValue('newHashedPassword');
      const findByIdAndUpdateSpy = jest.spyOn(userModel, 'findByIdAndUpdate');

      mockRequest.body = {
        email: 'test@example.com',
        answer: 'secret answer',
        newPassword: 'newPassword123',
      };

      await forgotPasswordController(mockRequest, mockResponse);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com', answer: 'secret answer' });
      expect(hashPassword).toHaveBeenCalledWith('newPassword123');
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith(user._id, { password: 'newHashedPassword' });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(sendSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Password Reset Successfully',
      });
    });

    it('should return 404 for wrong email or answer', async () => {
      userModel.findOne.mockResolvedValue(null);
      mockRequest.body = {
        email: 'wrong@example.com',
        answer: 'wrong answer',
        newPassword: 'newPassword123',
      };

      await forgotPasswordController(mockRequest, mockResponse);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'wrong@example.com', answer: 'wrong answer' });
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Wrong Email Or Answer',
      });
    });

    it('should return 400 for missing email', async () => {
      mockRequest.body = {
        answer: 'secret answer',
        newPassword: 'newPassword123',
      };
      await forgotPasswordController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({ message: 'Email is required' });
    });

    it('should return 400 for missing answer', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        newPassword: 'newPassword123',
      };
      await forgotPasswordController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({ message: 'answer is required' });
    });

    it('should return 400 for missing newPassword', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        answer: 'secret answer',
      };
      await forgotPasswordController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({ message: 'New Password is required' });
    });

    it('should handle internal server errors during password reset', async () => {
      userModel.findOne.mockRejectedValue(new Error('Database error'));
      mockRequest.body = {
        email: 'test@example.com',
        answer: 'secret answer',
        newPassword: 'newPassword123',
      };

      await forgotPasswordController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong',
        error: expect.any(Error),
      });
    });
  });

  describe('testController', () => {
    it('should return a success message', () => {
      testController(mockRequest, mockResponse);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(sendSpy).toHaveBeenCalledWith('Protected Routes');
    });
  });

  describe('updateProfileController', () => {
    const user = {
      _id: 'mockUserId',
      name: 'Old Name',
      email: 'old@example.com',
      password: 'hashedPassword',
      phone: '1112223333',
      address: 'Old Address',
    };

    it('should update user profile successfully with new data', async () => {
      userModel.findById.mockResolvedValue(user);
      hashPassword.mockResolvedValue('newHashedPassword');
      const findByIdAndUpdateSpy = jest.spyOn(userModel, 'findByIdAndUpdate');

      mockRequest.body = {
        name: 'New Name',
        email: 'new@example.com',
        password: 'newPassword123',
        phone: '4445556666',
        address: 'New Address',
      };
      mockRequest.user = { _id: 'mockUserId' }; // Ensure req.user is set

      await updateProfileController(mockRequest, mockResponse);

      expect(userModel.findById).toHaveBeenCalledWith('mockUserId');
      expect(hashPassword).toHaveBeenCalledWith('newPassword123');
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith('mockUserId', {
        name: 'New Name',
        password: 'newHashedPassword',
        phone: '4445556666',
        address: 'New Address',
      }, { new: true });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Profile Updated Successfully',
        updatedUser: expect.any(Object),
      }));
    });

    it('should update only specified fields', async () => {
      userModel.findById.mockResolvedValue(user);
      hashPassword.mockResolvedValue('newHashedPassword');
      const findByIdAndUpdateSpy = jest.spyOn(userModel, 'findByIdAndUpdate');

      mockRequest.body = {
        name: 'Updated Name Only',
      };
      mockRequest.user = { _id: 'mockUserId' };

      await updateProfileController(mockRequest, mockResponse);

      expect(userModel.findById).toHaveBeenCalledWith('mockUserId');
      expect(hashPassword).not.toHaveBeenCalled(); // Password not provided
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith('mockUserId', {
        name: 'Updated Name Only',
        password: user.password, // Should keep original password
        phone: user.phone,
        address: user.address,
      }, { new: true });
      expect(statusSpy).toHaveBeenCalledWith(200);
    });

    it('should return error for password less than 6 characters', async () => {
      userModel.findById.mockResolvedValue(user);
      mockRequest.body = {
        password: 'short',
      };
      mockRequest.user = { _id: 'mockUserId' };

      await updateProfileController(mockRequest, mockResponse);

      expect(userModel.findById).toHaveBeenCalledWith('mockUserId');
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Profile',
        error: expect.objectContaining({ message: 'Password is required and 6 character long' }),
      });
    });

    it('should handle internal server errors during profile update', async () => {
      userModel.findById.mockRejectedValue(new Error('Database error'));
      mockRequest.body = {
        name: 'New Name',
      };
      mockRequest.user = { _id: 'mockUserId' };

      await updateProfileController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Profile',
        error: expect.any(Error),
      });
    });
  });

  describe('getOrdersController', () => {
    const mockOrders = [
      { _id: 'order1', products: ['prod1'], buyer: 'userId', status: 'shipped' },
      { _id: 'order2', products: ['prod2'], buyer: 'userId', status: 'processing' },
    ];

    it('should get all orders for the logged-in user', async () => {
      const orderModel = require('../models/orderModel'); // Re-require to mock
      orderModel.find = jest.fn().mockResolvedValue(mockOrders);
      orderModel.prototype.populate = jest.fn().mockReturnThis();

      mockRequest.user = { _id: 'userId' };

      await getOrdersController(mockRequest, mockResponse);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: 'userId' });
      expect(orderModel.prototype.populate).toHaveBeenCalledWith('products', '-photo');
      expect(orderModel.prototype.populate).toHaveBeenCalledWith('buyer', 'name');
      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    it('should handle internal server errors when getting orders', async () => {
      const orderModel = require('../models/orderModel');
      orderModel.find.mockRejectedValue(new Error('Database error'));

      mockRequest.user = { _id: 'userId' };

      await getOrdersController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: expect.any(Error),
      });
    });
  });

  describe('getAllOrdersController', () => {
    const mockOrders = [
      { _id: 'order1', products: ['prod1'], buyer: 'user1', status: 'shipped' },
      { _id: 'order2', products: ['prod2'], buyer: 'user2', status: 'processing' },
    ];

    it('should get all orders for all users', async () => {
      const orderModel = require('../models/orderModel');
      orderModel.find = jest.fn().mockResolvedValue(mockOrders);
      orderModel.prototype.populate = jest.fn().mockReturnThis();
      orderModel.prototype.sort = jest.fn().mockReturnThis();

      await getAllOrdersController(mockRequest, mockResponse);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(orderModel.prototype.populate).toHaveBeenCalledWith('products', '-photo');
      expect(orderModel.prototype.populate).toHaveBeenCalledWith('buyer', 'name');
      expect(orderModel.prototype.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    it('should handle internal server errors when getting all orders', async () => {
      const orderModel = require('../models/orderModel');
      orderModel.find.mockRejectedValue(new Error('Database error'));

      await getAllOrdersController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: expect.any(Error),
      });
    });
  });

  describe('orderStatusController', () => {
    it('should update the order status', async () => {
      const orderModel = require('../models/orderModel');
      const updatedOrder = { _id: 'orderId', status: 'delivered' };
      orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      mockRequest.params.orderId = 'orderId';
      mockRequest.body.status = 'delivered';

      await orderStatusController(mockRequest, mockResponse);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith('orderId', { status: 'delivered' }, { new: true });
      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });

    it('should handle internal server errors when updating order status', async () => {
      const orderModel = require('../models/orderModel');
      orderModel.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      mockRequest.params.orderId = 'orderId';
      mockRequest.body.status = 'delivered';

      await orderStatusController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Order',
        error: expect.any(Error),
      });
    });
  });

  describe('getAllUsersController', () => {
    const mockUsers = [
      { _id: 'user1', name: 'User One', email: 'user1@example.com' },
      { _id: 'user2', name: 'User Two', email: 'user2@example.com' },
    ];

    it('should get all users', async () => {
      userModel.find.mockResolvedValue(mockUsers);
      userModel.select = jest.fn().mockReturnThis();
      userModel.sort = jest.fn().mockReturnThis();

      await getAllUsersController(mockRequest, mockResponse);

      expect(userModel.find).toHaveBeenCalledWith({});
      expect(userModel.select).toHaveBeenCalledWith('-password');
      expect(userModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(sendSpy).toHaveBeenCalledWith(mockUsers);
    });

    it('should handle internal server errors when getting users', async () => {
      userModel.find.mockRejectedValue(new Error('Database error'));

      await getAllUsersController(mockRequest, mockResponse);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error while getting users',
        error: expect.any(Error),
      });
    });
  });
});