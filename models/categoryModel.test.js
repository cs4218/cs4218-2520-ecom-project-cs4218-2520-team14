// Chia York Lim, A0258147X
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

  it('should create a category with name and slug', async () => {
    // Arrange
    const categoryData = {
      name: 'Electronics',
      slug: 'electronics'
    };

    // Act
    const saved = await categoryModel.create(categoryData);

    // Assert
    expect(saved.name).toBe(categoryData.name);
    expect(saved.slug).toBe(categoryData.slug);
  });

  it('should lower case slug', async () => {
    // Arrange
    const categoryData = {
      name: 'Electronics',
      slug: 'ELECTRONICS'
    };

    // Act
    const category = await categoryModel.create(categoryData);

    // Assert
    expect(category.slug).toBe('electronics');
  });

  it('should not allow empty name', () => {
    // Arrange
    const categoryData = {
      name: '',
      slug: 'electronics'
    };
    const category = new categoryModel(categoryData);

    // Act
    const error = category.validateSync();

    // Assert
    expect(error).toBeDefined();
    expect(error.errors.name.message).toBe('Name is required');
  });

  it('should not allow empty slug', () => {
    // Arrange
    const categoryData = {
      name: 'Electronics',
      slug: ''
    };
    const category = new categoryModel(categoryData);

    // Act
    const error = category.validateSync();

    // Assert
    expect(error).toBeDefined();
    expect(error.errors.slug.message).toBe('Slug is required');
  });

  it('should enforce unique name', async () => {
    // Arrange
    const categoryData = {
      name: 'Electronics',
      slug: 'electronics'
    };
    await categoryModel.create(categoryData);

    // Act
    const duplicateCategory = categoryModel.create(categoryData);

    // Assert
    await expect(duplicateCategory).rejects.toThrow();
  });
});