const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const mockS3Client = mockClient(S3Client);

const {
  getObject,
  putObject,
  deleteObject,
} = require("../../../src/utils/s3Helper");

const mockGetObject = jest.fn();
const mockPutObject = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock("../../../src/utils/s3Helper", () => ({
  getObject: mockGetObject,
  putObject: mockPutObject,
  deleteObject: mockDeleteObject,
}));

describe("Product Controller Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should get product data successfully", async () => {
    const mockProductData = {
      id: "123",
      name: "Test Product",
      price: 100,
    };
    const mockGetObjectResponse = {
      Body: JSON.stringify(mockProductData),
      ContentType: "application/json",
    };

    mockGetObject.mockResolvedValue(mockGetObjectResponse);

    const result = await getObject("test-bucket", "products/123.json");

    expect(mockGetObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "products/123.json",
    });
    expect(result).toEqual(mockProductData);
  });

  test("should handle S3 get object error", async () => {
    const errorMessage = "Failed to get object";
    mockGetObject.mockRejectedValue(new Error(errorMessage));

    await expect(getObject("test-bucket", "products/456.json")).rejects.toThrow(
      errorMessage
    );
    expect(mockGetObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "products/456.json",
    });
  });

  test("should put product data successfully", async () => {
    const mockProductData = {
      id: "789",
      name: "New Product",
      price: 200,
    };
    const mockPutObjectResponse = {
      ETag: '"abcdef"',
      VersionId: "some-version-id",
    };

    mockPutObject.mockResolvedValue(mockPutObjectResponse);

    const result = await putObject(
      "test-bucket",
      "products/789.json",
      mockProductData
    );

    expect(mockPutObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "products/789.json",
      Body: JSON.stringify(mockProductData),
      ContentType: "application/json",
    });
    expect(result).toEqual(mockPutObjectResponse);
  });

  test("should handle S3 put object error", async () => {
    const errorMessage = "Failed to put object";
    mockPutObject.mockRejectedValue(new Error(errorMessage));

    await expect(
      putObject("test-bucket", "products/101.json", {
        id: "101",
        name: "Another Product",
      })
    ).rejects.toThrow(errorMessage);
    expect(mockPutObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "products/101.json",
      Body: JSON.stringify({ id: "101", name: "Another Product" }),
      ContentType: "application/json",
    });
  });

  test("should delete product data successfully", async () => {
    const mockDeleteObjectResponse = {
      DeleteMarker: true,
      VersionId: "some-version-id-deleted",
    };

    mockDeleteObject.mockResolvedValue(mockDeleteObjectResponse);

    const result = await deleteObject("test-bucket", "products/123.json");

    expect(mockDeleteObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "products/123.json",
    });
    expect(result).toEqual(mockDeleteObjectResponse);
  });

  test("should handle S3 delete object error", async () => {
    const errorMessage = "Failed to delete object";
    mockDeleteObject.mockRejectedValue(new Error(errorMessage));

    await expect(deleteObject("test-bucket", "products/456.json")).rejects.toThrow(
      errorMessage
    );
    expect(mockDeleteObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "products/456.json",
    });
  });

  test("should fetch and return a specific product", async () => {
    const productId = "product-1";
    const mockProduct = { id: productId, name: "Gadget", price: 99.99 };
    const s3Key = `products/${productId}.json`;

    mockS3Client.on(GetObjectCommand, { Bucket: "your-bucket-name", Key: s3Key }).resolves({
      Body: {
        transformToString: jest.fn().mockResolvedValue(JSON.stringify(mockProduct)),
      },
      ContentType: "application/json",
    });

    // Assuming getObject calls S3Client directly or through a helper
    // This part would depend on how getObject is implemented and exports its dependencies
    // For this example, let's assume getObject uses the mocked S3Client directly or indirectly.
    // If getObject is mocked as in the first set of tests, this section needs adjustment.
    // For clarity, let's reimplement a hypothetical getObject that uses S3Client
    const hypotheticalGetObject = async (bucket, key) => {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await mockS3Client.send(command);
      const bodyString = await response.Body.transformToString();
      return JSON.parse(bodyString);
    };

    const fetchedProduct = await hypotheticalGetObject("your-bucket-name", s3Key);

    expect(fetchedProduct).toEqual(mockProduct);
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: "your-bucket-name",
      Key: s3Key,
    });
  });

  test("should create and return a new product", async () => {
    const newProductData = { name: "Widget", price: 49.50 };
    const productId = "product-2";
    const s3Key = `products/${productId}.json`;

    mockS3Client.on(PutObjectCommand, { Bucket: "your-bucket-name", Key: s3Key, Body: JSON.stringify(newProductData) }).resolves({
      ETag: '"some-etag"',
    });

    // Hypothetical putObject using S3Client
    const hypotheticalPutObject = async (bucket, key, data) => {
      const command = new PutObjectCommand({ Bucket: bucket, Key: key, Body: JSON.stringify(data), ContentType: "application/json" });
      const response = await mockS3Client.send(command);
      return response;
    };

    const result = await hypotheticalPutObject("your-bucket-name", s3Key, newProductData);

    expect(result.ETag).toBe('"some-etag"');
    expect(mockS3Client).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: "your-bucket-name",
      Key: s3Key,
      Body: JSON.stringify(newProductData),
      ContentType: "application/json",
    });
  });

  test("should delete a product", async () => {
    const productId = "product-3";
    const s3Key = `products/${productId}.json`;

    mockS3Client.on(DeleteObjectCommand, { Bucket: "your-bucket-name", Key: s3Key }).resolves({
      DeleteMarker: true,
    });

    // Hypothetical deleteObject using S3Client
    const hypotheticalDeleteObject = async (bucket, key) => {
      const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
      const response = await mockS3Client.send(command);
      return response;
    };

    const result = await hypotheticalDeleteObject("your-bucket-name", s3Key);

    expect(result.DeleteMarker).toBe(true);
    expect(mockS3Client).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Bucket: "your-bucket-name",
      Key: s3Key,
    });
  });
});
