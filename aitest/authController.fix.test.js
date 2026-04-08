import { registerController, loginController, forgotPasswordController, testController, updateProfileController, getOrdersController, getAllOrdersController, orderStatusController, getAllUsersController } from '../controllers/authController.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import { hashPassword, comparePassword } from '../helpers/authHelper.js';
import JWT from 'jsonwebtoken';

jest.mock('../models/userModel.js');
jest.mock('../models/orderModel.js');
jest.mock('../helpers/authHelper.js');
jest.mock('jsonwebtoken');

describe('Auth Controller Tests', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, params: {}, user: { _id: 'mockId' } };
    res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };
    jest.clearAllMocks();
  });

  describe('registerController', () => {
    it('should return 400 if fields are missing', async () => {
      await registerController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should register a new user successfully', async () => {
      req.body = { name: 'n', email: 'e', password: 'p', phone: '1', address: 'a', answer: 'a' };
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashed');
      userModel.prototype.save.mockResolvedValue({ _id: '1', ...req.body });
      
      await registerController(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('loginController', () => {
    it('should login successfully', async () => {
      req.body = { email: 'e', password: 'p' };
      userModel.findOne.mockResolvedValue({ _id: '1', password: 'hashed' });
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue('token');
      
      await loginController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('forgotPasswordController', () => {
    it('should reset password successfully', async () => {
      req.body = { email: 'e', answer: 'a', newPassword: 'p' };
      userModel.findOne.mockResolvedValue({ _id: '1' });
      hashPassword.mockResolvedValue('newHashed');
      userModel.findByIdAndUpdate.mockResolvedValue({});
      
      await forgotPasswordController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('testController', () => {
    it('should return protected route message', () => {
      testController(req, res);
      expect(res.send).toHaveBeenCalledWith('Protected Routes');
    });
  });

  describe('updateProfileController', () => {
    it('should update user profile', async () => {
      userModel.findById.mockResolvedValue({ name: 'old' });
      userModel.findByIdAndUpdate.mockResolvedValue({ name: 'new' });
      await updateProfileController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Orders Controllers', () => {
    it('should get orders for user', async () => {
      const mockPopulate = jest.fn().mockReturnThis();
      orderModel.find.mockReturnValue({ populate: mockPopulate });
      await getOrdersController(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('should get all orders', async () => {
      const mockChain = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([]) };
      orderModel.find.mockReturnValue(mockChain);
      await getAllOrdersController(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('should update order status', async () => {
      req.params = { orderId: 'o1' };
      req.body = { status: 'shipped' };
      orderModel.findByIdAndUpdate.mockResolvedValue({});
      await orderStatusController(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getAllUsersController', () => {
    it('should get all users', async () => {
      userModel.find.mockReturnValue({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([]) });
      await getAllUsersController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});