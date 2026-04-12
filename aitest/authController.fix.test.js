import { registerController, loginController, forgotPasswordController, testController, updateProfileController, getOrdersController, getAllOrdersController, orderStatusController, getAllUsersController } from '../controllers/authController.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import { hashPassword, comparePassword } from '../helpers/authHelper.js';
import JWT from 'jsonwebtoken';

jest.mock('../models/userModel.js');
jest.mock('../models/orderModel.js');
jest.mock('../helpers/authHelper.js');
jest.mock('jsonwebtoken');

describe('authController', () => {
  let req, res;
  beforeEach(() => {
    req = { body: {}, params: {}, user: { _id: 'mockId' } };
    res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };
    jest.clearAllMocks();
  });

  describe('registerController', () => {
    it('should register a new user successfully', async () => {
      req.body = { name: 'n', email: 'e', password: 'p', phone: 'p', address: 'a', answer: 'a' };
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hp');
      userModel.prototype.save = jest.fn().mockResolvedValue({ ...req.body, _id: 'id' });
      await registerController(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
    it('should return 400 if validation fails', async () => {
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 409 if user exists', async () => {
        req.body = { name: 'n', email: 'e', password: 'p', phone: 'p', address: 'a', answer: 'a' };
        userModel.findOne.mockResolvedValue({ email: 'e' });
        await registerController(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('loginController', () => {
    it('should login successfully', async () => {
        req.body = { email: 'e', password: 'p' };
        userModel.findOne.mockResolvedValue({ _id: 'id', password: 'hp' });
        comparePassword.mockResolvedValue(true);
        JWT.sign.mockReturnValue('token');
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    it('should return 404 if user not found', async () => {
        req.body = { email: 'e', password: 'p' };
        userModel.findOne.mockResolvedValue(null);
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('forgotPasswordController', () => {
      it('should reset password', async () => {
          req.body = { email: 'e', answer: 'a', newPassword: 'p' };
          userModel.findOne.mockResolvedValue({ _id: 'id' });
          hashPassword.mockResolvedValue('h');
          userModel.findByIdAndUpdate.mockResolvedValue({});
          await forgotPasswordController(req, res);
          expect(res.status).toHaveBeenCalledWith(200);
      });
  });

  describe('updateProfileController', () => {
      it('should update profile', async () => {
          userModel.findById.mockResolvedValue({ name: 'old' });
          userModel.findByIdAndUpdate.mockResolvedValue({ name: 'new' });
          await updateProfileController(req, res);
          expect(res.status).toHaveBeenCalledWith(200);
      });
  });

  describe('Order Controllers', () => {
      it('getOrdersController returns orders', async () => {
          orderModel.find.mockReturnValue({ populate: jest.fn().mockReturnThis() });
          await getOrdersController(req, res);
          expect(res.json).toHaveBeenCalled();
      });
      it('getAllOrdersController returns all orders', async () => {
          orderModel.find.mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([]) });
          await getAllOrdersController(req, res);
          expect(res.json).toHaveBeenCalled();
      });
  });
});