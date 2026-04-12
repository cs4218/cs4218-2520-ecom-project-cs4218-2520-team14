import { createProductController, getProductController, getSingleProductController, productPhotoController, deleteProductController, updateProductController, productFiltersController, productCountController, productListController, searchProductController, relatedProductController, productCategoryController, braintreeTokenController, brainTreePaymentController } from '../controllers/productController';
import productModel from '../models/productModel';
import categoryModel from '../models/categoryModel';
import orderModel from '../models/orderModel';
import { getBraintreeGateway } from '../controllers/braintree';
import fs from 'fs';

jest.mock('../models/productModel');
jest.mock('../models/categoryModel');
jest.mock('../models/orderModel');
jest.mock('../controllers/braintree');
jest.mock('fs');

describe('Product Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = { fields: {}, files: {}, params: {}, body: {}, user: { _id: 'user123' } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('createProductController', () => {
    it('should return 400 if name is missing', async () => {
      req.fields = { description: 'desc', price: 10, category: 'cat', quantity: 1 };
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create product successfully', async () => {
      req.fields = { name: 'P1', description: 'desc', price: 10, category: 'cat', quantity: 1 };
      productModel.prototype.save = jest.fn().mockResolvedValue({});
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getProductController', () => {
    it('should return all products', async () => {
      const mockProducts = [{ name: 'P1' }];
      productModel.find.mockReturnValue({ populate: () => ({ select: () => ({ limit: () => ({ sort: jest.fn().mockResolvedValue(mockProducts) }) }) }) });
      await getProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('productPhotoController', () => {
    it('should return 404 if product not found', async () => {
      productModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await productPhotoController(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteProductController', () => {
    it('should delete product successfully', async () => {
      productModel.findByIdAndDelete.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: '1' }) });
      await deleteProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('braintreeTokenController', () => {
    it('should return fake token in test mode', async () => {
      process.env.DEV_MODE = 'test';
      await braintreeTokenController(req, res);
      expect(res.send).toHaveBeenCalledWith({ clientToken: 'fake-client-token' });
    });
  });

  describe('brainTreePaymentController', () => {
    it('should process payment successfully', async () => {
      process.env.DEV_MODE = 'test';
      req.body = { nonce: 'nonce', cart: [{ price: 10, _id: '1' }] };
      orderModel.prototype.save = jest.fn().mockResolvedValue({});
      await brainTreePaymentController(req, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('should return 400 for invalid cart', async () => {
      req.body = { cart: 'not-an-array' };
      await brainTreePaymentController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});