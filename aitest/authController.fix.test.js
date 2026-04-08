import request from 'supertest';
import express from 'express';
import * as authController from '../controllers/authController.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import { comparePassword, hashPassword } from '../helpers/authHelper.js';
import JWT from 'jsonwebtoken';

// Mocking models and helpers
jest.mock('../models/userModel.js');
jest.mock('../models/orderModel.js');
jest.mock('../helpers/authHelper.js');

// Mock JWT secret
const JWT_SECRET = 'testsecret';
process.env.JWT_SECRET = JWT_SECRET;

const app = express();
app.use(express.json());

// Mock request and response objects
let mockRequest;
let mockResponse;
let responseJsonSpy;
let responseStatusSpy;

// Mock user data
const mockUser = {
  _id: '60f7b3b3b3b3b3b3b3b3b3b3',
  name: 'John Doe',
  email: 'john.doe@example.com',
  password: 'hashedpassword',
  phone: '1234567890',
  address: '123 Main St',
  answer: 'secretanswer',
  role: 0,
};

const mockUserResponse = {
  _id: mockUser._id,
  name: mockUser.name,
  email: mockUser.email,
  phone: mockUser.phone,
  address: mockUser.address,
  answer: mockUser.answer,
  role: mockUser.role,
  createdAt: '2023-01-01T10:00:00Z',
  updatedAt: '2023-01-01T10:00:00Z',
};

const mockLoginUserResponse = {
  _id: mockUser._id,
  name: mockUser.name,
  email: mockUser.email,
  phone: mockUser.phone,
  address: mockUser.address,
  role: mockUser.role,
};

// Mock orders
const mockOrder = {
  _id: 'order123',
  products: [{ _id: 'prod1', name: 'Product 1' }],
  buyer: mockUser._id,
  payment: { success: true, transaction: {} },
  status: 'Shipped',
  createdAt: '2023-01-01T10:00:00Z',
};

const mockPopulatedOrder = {
  _id: mockOrder._id,
  products: [{ _id: 'prod1', name: 'Product 1', photo: '...' }],
  buyer: { _id: mockUser._id, name: mockUser.name },
  payment: { success: true, transaction: {} },
  status: 'Shipped',
  createdAt: '2023-01-01T10:00:00Z',
};

// Mock JWT token
const mockToken = JWT.sign({ _id: mockUser._id }, JWT_SECRET, { expiresIn: '7d' });

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();

  // Mock request and response objects
  mockRequest = {
    body: {},
    params: {},
    user: { _id: mockUser._id }, // For authenticated routes
  };
  mockResponse = {
    status: jest.fn(() => mockResponse),
    json: jest.fn(),
    send: jest.fn(),
  };
  responseJsonSpy = jest.spyOn(mockResponse, 'json');
  responseStatusSpy = jest.spyOn(mockResponse, 'status');

  // Default mocks for models and helpers
  userModel.findOne.mockResolvedValue(null);
  userModel.findOne.mockResolvedValue(null); // For login
  userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
  userModel.findById.mockResolvedValue(mockUser);
  userModel.save.mockResolvedValue(mockUser);
  userModel.select.mockReturnThis(); // For chaining
  userModel.sort.mockReturnThis(); // For chaining
  userModel.find.mockResolvedValue([mockUser]);
  orderModel.find.mockResolvedValue([mockOrder]);
  orderModel.findByIdAndUpdate.mockResolvedValue(mockOrder);
  orderModel.populate.mockReturnThis(); // For chaining
  hashPassword.mockResolvedValue('hashedpassword');
  comparePassword.mockResolvedValue(true);
});

describe('Auth Controller', () => {
  describe('registerController', () => {
    it('should register a new user successfully', async () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main St',
        answer: 'secretanswer',
      };

      userModel.findOne.mockResolvedValue(null);
      const newUser = { ...mockUser, password: 'hashedpassword' };
      userModel.prototype.save.mockResolvedValue(newUser);

      await authController.registerController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(201);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User Register Successfully',
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          address: newUser.address,
          answer: newUser.answer,
          role: newUser.role,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com' });
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(userModel.prototype.save).toHaveBeenCalled();
    });

    it('should return 409 if email already exists', async () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main St',
        answer: 'secretanswer',
      };
      userModel.findOne.mockResolvedValue(mockUser);

      await authController.registerController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(409);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Already Register please login',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com' });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.prototype.save).not.toHaveBeenCalled();
    });

    it('should return 400 for missing name', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main St',
        answer: 'secretanswer',
      };
      await authController.registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Name is Required',
      });
    });

    it('should return 400 for missing email', async () => {
      mockRequest.body = {
        name: 'John Doe',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main St',
        answer: 'secretanswer',
      };
      await authController.registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Email is Required',
      });
    });

    it('should return 400 for missing password', async () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        address: '123 Main St',
        answer: 'secretanswer',
      };
      await authController.registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Password is Required',
      });
    });

    it('should return 400 for missing phone', async () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        address: '123 Main St',
        answer: 'secretanswer',
      };
      await authController.registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Phone no is Required',
      });
    });

    it('should return 400 for missing address', async () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890',
        answer: 'secretanswer',
      };
      await authController.registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Address is Required',
      });
    });

    it('should return 400 for missing answer', async () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main St',
      };
      await authController.registerController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Answer is Required',
      });
    });

    it('should handle server errors during registration', async () => {
      mockRequest.body = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890',
        address: '123 Main St',
        answer: 'secretanswer',
      };
      const serverError = new Error('Database error');
      userModel.findOne.mockRejectedValue(serverError);

      await authController.registerController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error in Registration',
        error: 'Database error',
      });
    });
  });

  describe('loginController', () => {
    it('should log in a user successfully', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        password: 'password123',
      };
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);

      await authController.loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'login successfully',
        user: mockLoginUserResponse,
        token: expect.any(String),
      }));
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com' });
      expect(comparePassword).toHaveBeenCalledWith('password123', mockUser.password);
    });

    it('should return 400 for missing email or password', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
      };
      await authController.loginController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      userModel.findOne.mockResolvedValue(null);

      await authController.loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(404);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Email is not registerd',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(comparePassword).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid password', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        password: 'wrongpassword',
      };
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      await authController.loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(401);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid Password',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com' });
      expect(comparePassword).toHaveBeenCalledWith('wrongpassword', mockUser.password);
    });

    it('should handle server errors during login', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        password: 'password123',
      };
      const serverError = new Error('Database error');
      userModel.findOne.mockRejectedValue(serverError);

      await authController.loginController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error in login',
        error: 'Database error',
      });
    });
  });

  describe('forgotPasswordController', () => {
    it('should reset password successfully', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        answer: 'secretanswer',
        newPassword: 'newsecurepassword',
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue('newhashedpassword');
      userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser, password: 'newhashedpassword' });

      await authController.forgotPasswordController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Password Reset Successfully',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com', answer: 'secretanswer' });
      expect(hashPassword).toHaveBeenCalledWith('newsecurepassword');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser._id, { password: 'newhashedpassword' });
    });

    it('should return 400 for missing email', async () => {
      mockRequest.body = {
        answer: 'secretanswer',
        newPassword: 'newsecurepassword',
      };
      await authController.forgotPasswordController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({ message: 'Email is required' });
    });

    it('should return 400 for missing answer', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        newPassword: 'newsecurepassword',
      };
      await authController.forgotPasswordController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({ message: 'answer is required' });
    });

    it('should return 400 for missing newPassword', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        answer: 'secretanswer',
      };
      await authController.forgotPasswordController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({ message: 'New Password is required' });
    });

    it('should return 404 if email or answer is wrong', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        answer: 'wronganswer',
        newPassword: 'newsecurepassword',
      };
      userModel.findOne.mockResolvedValue(null);

      await authController.forgotPasswordController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(404);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Wrong Email Or Answer',
      });
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'john.doe@example.com', answer: 'wronganswer' });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle server errors during password reset', async () => {
      mockRequest.body = {
        email: 'john.doe@example.com',
        answer: 'secretanswer',
        newPassword: 'newsecurepassword',
      };
      const serverError = new Error('Database error');
      userModel.findOne.mockRejectedValue(serverError);

      await authController.forgotPasswordController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong',
        error: serverError,
      });
    });
  });

  describe('testController', () => {
    it('should return protected routes message', async () => {
      await authController.testController(mockRequest, mockResponse);
      expect(responseStatusSpy).not.toHaveBeenCalled(); // Default is res.send, not res.status().send()
      expect(mockResponse.send).toHaveBeenCalledWith('Protected Routes');
    });
  });

  describe('updateProfileController', () => {
    it('should update user profile successfully', async () => {
      mockRequest.user = { _id: mockUser._id }; // Ensure user is authenticated
      mockRequest.body = {
        name: 'Jane Doe',
        phone: '9876543210',
      };
      const updatedUserData = { ...mockUser, name: 'Jane Doe', phone: '9876543210' };
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await authController.updateProfileController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Profile Updated Successfully',
        updatedUser: updatedUserData,
      });
      expect(userModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser._id, {
        name: 'Jane Doe',
        password: undefined,
        phone: '9876543210',
        address: undefined,
      }, { new: true });
    });

    it('should update password successfully', async () => {
      mockRequest.user = { _id: mockUser._id };
      mockRequest.body = {
        password: 'newpassword',
      };
      hashPassword.mockResolvedValue('hashednewpassword');
      const updatedUserData = { ...mockUser, password: 'hashednewpassword' };
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await authController.updateProfileController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser._id, {
        name: mockUser.name,
        password: 'hashednewpassword',
        phone: mockUser.phone,
        address: mockUser.address,
      }, { new: true });
    });

    it('should return error for password less than 6 characters', async () => {
      mockRequest.user = { _id: mockUser._id };
      mockRequest.body = {
        password: 'pass',
      };
      await authController.updateProfileController(mockRequest, mockResponse);
      expect(responseStatusSpy).toHaveBeenCalledWith(400); // Assuming controller sends 400 here
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Profile',
        error: expect.any(Object), // The error object from the controller
      });
      expect(userModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle server errors during profile update', async () => {
      mockRequest.user = { _id: mockUser._id };
      mockRequest.body = {
        name: 'Jane Doe',
      };
      const serverError = new Error('Database error');
      userModel.findById.mockRejectedValue(serverError);

      await authController.updateProfileController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(400);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Profile',
        error: serverError,
      });
    });
  });

  describe('getOrdersController', () => {
    it('should get orders for the logged-in user', async () => {
      mockRequest.user = { _id: mockUser._id };
      const userOrders = [{ ...mockOrder, buyer: mockUser._id }];
      orderModel.find.mockResolvedValue(userOrders);
      orderModel.populate.mockResolvedValue(mockPopulatedOrder);

      await authController.getOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).not.toHaveBeenCalled(); // Default is res.json()
      expect(responseJsonSpy).toHaveBeenCalledWith(userOrders);
      expect(orderModel.find).toHaveBeenCalledWith({ buyer: mockUser._id });
      expect(orderModel.populate).toHaveBeenCalledWith('products', '-photo');
      expect(orderModel.populate).toHaveBeenCalledWith('buyer', 'name');
    });

    it('should handle server errors when getting user orders', async () => {
      mockRequest.user = { _id: mockUser._id };
      const serverError = new Error('Database error');
      orderModel.find.mockRejectedValue(serverError);

      await authController.getOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: serverError,
      });
    });
  });

  describe('getAllOrdersController', () => {
    it('should get all orders', async () => {
      const allOrders = [mockOrder];
      orderModel.find.mockResolvedValue(allOrders);
      orderModel.populate.mockResolvedValue(mockPopulatedOrder);

      await authController.getAllOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).not.toHaveBeenCalled(); // Default is res.json()
      expect(responseJsonSpy).toHaveBeenCalledWith(allOrders);
      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(orderModel.populate).toHaveBeenCalledWith('products', '-photo');
      expect(orderModel.populate).toHaveBeenCalledWith('buyer', 'name');
      expect(orderModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should handle server errors when getting all orders', async () => {
      const serverError = new Error('Database error');
      orderModel.find.mockRejectedValue(serverError);

      await authController.getAllOrdersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Getting Orders',
        error: serverError,
      });
    });
  });

  describe('orderStatusController', () => {
    it('should update order status', async () => {
      const orderId = 'order123';
      const newStatus = 'Delivered';
      mockRequest.params.orderId = orderId;
      mockRequest.body.status = newStatus;
      const updatedOrder = { ...mockOrder, status: newStatus };
      orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      await authController.orderStatusController(mockRequest, mockResponse);

      expect(responseStatusSpy).not.toHaveBeenCalled(); // Default is res.json()
      expect(responseJsonSpy).toHaveBeenCalledWith(updatedOrder);
      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(orderId, { status: newStatus }, { new: true });
    });

    it('should handle server errors when updating order status', async () => {
      const orderId = 'order123';
      const newStatus = 'Delivered';
      mockRequest.params.orderId = orderId;
      mockRequest.body.status = newStatus;
      const serverError = new Error('Database error');
      orderModel.findByIdAndUpdate.mockRejectedValue(serverError);

      await authController.orderStatusController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error While Updating Order',
        error: serverError,
      });
    });
  });

  describe('getAllUsersController', () => {
    it('should get all users', async () => {
      const users = [mockUser];
      userModel.find.mockResolvedValue(users);
      userModel.select.mockReturnThis();

      await authController.getAllUsersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(200);
      expect(responseJsonSpy).toHaveBeenCalledWith(users);
      expect(userModel.find).toHaveBeenCalledWith({});
      expect(userModel.select).toHaveBeenCalledWith('-password');
      expect(userModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should handle server errors when getting all users', async () => {
      const serverError = new Error('Database error');
      userModel.find.mockRejectedValue(serverError);

      await authController.getAllUsersController(mockRequest, mockResponse);

      expect(responseStatusSpy).toHaveBeenCalledWith(500);
      expect(responseJsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Error while getting users',
        error: serverError,
      });
    });
  });
});