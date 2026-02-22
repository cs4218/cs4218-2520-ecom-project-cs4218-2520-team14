import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import categoryModel from "./categoryModel";

let mongoServer;

describe('Category Model', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await categoryModel.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await categoryModel.deleteMany();
  });

  it('should create a category with name and slug', () => {
    const categoryData = {
      name: 'Electronics',
      slug: 'electronics'
    };

    const category = new categoryModel(categoryData);
    expect(category.name).toBe(categoryData.name);
    expect(category.slug).toBe(categoryData.slug);
  });

  it('should lower case slug', () => {
    const categoryData = {
      name: 'Electronics',
      slug: 'ELECTRONICS'
    };
    const category = new categoryModel(categoryData);
    expect(category.slug).toBe('electronics');
  });

  it('should not allow empty name', () => {
    const categoryData = {
      name: '',
      slug: 'electronics'
    };
    const category = new categoryModel(categoryData);
    const error = category.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.name.message).toBe('Name is required');
  });

  it('should not allow empty slug', () => {
    const categoryData = {
      name: 'Electronics',
      slug: ''
    };
    const category = new categoryModel(categoryData);
    const error = category.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.slug.message).toBe('Slug is required');
  });

  it('should enforce unique name', async () => {
    const categoryData = {
      name: 'Electronics',
      slug: 'electronics'
    };
    await categoryModel.create(categoryData);
    await expect(categoryModel.create(categoryData)).rejects.toThrow();
  });
});