import { createProductController, getProductController, getSingleProductController, productPhotoController, deleteProductController, updateProductController, productFiltersController, productCountController, productListController, searchProductController, relatedProductController, productCategoryController, braintreeTokenController, brainTreePaymentController } from '../controllers/productController.js';
import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import orderModel from '../models/orderModel.js';
import { getBraintreeGateway } from '../controllers/braintree.js';
import fs from 'fs';

jest.mock('../models/productModel.js');
jest.mock('../models/categoryModel.js');
jest.mock('../models/orderModel.js');
jest.mock('../controllers/braintree.js');
jest.mock('fs');

describe('Product Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = { fields: {}, files: {}, params: {}, body: {}, user: { _id: 'user123' } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('createProductController', () => {
    it('should return 400 if validation fails', async () => {
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create product successfully', async () => {
      req.fields = { name: 'P1', description: 'D1', price: 10, category: 'C1', quantity: 1 };
      productModel.prototype.save = jest.fn().mockResolvedValue({});
      await createProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getProductController', () => {
    it('should return all products', async () => {
      productModel.find.mockReturnValue({ populate: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([]) });
      await getProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('productPhotoController', () => {
    it('should return 404 if photo not found', async () => {
      productModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await productPhotoController({ params: { pid: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteProductController', () => {
    it('should delete product successfully', async () => {
      productModel.findByIdAndDelete.mockReturnValue({ select: jest.fn().mockResolvedValue({}) });
      await deleteProductController({ params: { pid: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('productFiltersController', () => {
    it('should filter products', async () => {
      req.body = { checked: [], radio: [] };
      productModel.find.mockResolvedValue([]);
      await productFiltersController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('productCountController', () => {
    it('should return count', async () => {
      productModel.find.mockReturnValue({ estimatedDocumentCount: jest.fn().mockResolvedValue(5) });
      await productCountController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('brainTreePaymentController', () => {
    it('should fail with invalid cart', async () => {
      req.body = { cart: 'not-an-array' };
      await brainTreePaymentController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('productCategoryController', () => {
    it('should return products by category', async () => {
      categoryModel.findOne.mockResolvedValue({ _id: 'cat1' });
      productModel.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      await productCategoryController({ params: { slug: 'test' } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});