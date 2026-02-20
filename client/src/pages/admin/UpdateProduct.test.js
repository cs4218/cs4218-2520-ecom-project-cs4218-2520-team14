// Jonas Ong, A0252052U

import axios from "axios";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateProduct from "./UpdateProduct";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { describe } from "node:test";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <main>{children}</main>
));
jest.mock("antd", () => {
  const Select = ({ children, onChange, placeholder }) => (
    <select
      data-testid="test-select"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );

  Select.Option = ({ children, value }) => (
    <option value={value} data-testid="test-selection">
      {children}
    </option>
  );

  return { ...jest.requireActual("antd"), Select };
});

const data = {
  _id: "54321",
  name: "Test Product",
  description: "Test Description",
  price: 100,
  quantity: 10,
  shipping: 1, // Yes
  category: { _id: "12345" },
  slug: "test-slug",
};

const renderUpdateProduct = () =>
  render(
    <MemoryRouter
      initialEntries={[`/dashboard/admin/update-product/${data.slug}`]}
    >
      <Routes>
        <Route
          path="/dashboard/admin/update-product/:slug"
          element={<UpdateProduct />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("UpdateProduct Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    axios.get.mockImplementation((url) => {
      if (url === `/api/v1/product/get-product/${data.slug}`) {
        return Promise.resolve({ data: { product: data } });
      } else if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: {
            success: true,
            category: [
              { _id: "12345", name: "TestCategory" },
              { _id: "67890", name: "TestCategory2" },
            ],
          },
        });
      }
    });
  });

  describe("(Fetching)", () => {
    it("should render categories correctly if categories exist", async () => {
      renderUpdateProduct();

      await screen.findByText("TestCategory");
      await screen.findByText("TestCategory2");
    });

    it("should show error toast if fetching categories fails", async () => {
      axios.get.mockRejectedValue(new Error("Network Error"));

      renderUpdateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting category",
      );
    });

    it("should render correctly", async () => {
      renderUpdateProduct();

      await screen.findByText("TestCategory");
      expect(await screen.findByAltText("product_photo")).toHaveAttribute(
        "src",
        expect.stringContaining(data._id),
      );
      await screen.findByDisplayValue(data.name);
      await screen.findByDisplayValue(data.description);
      await screen.findByDisplayValue(data.price.toString());
      await screen.findByDisplayValue(data.quantity.toString());
      await screen.findByText("Yes");
    });
  });

  describe("(Updating)", () => {
    it("should update name and show success toast on successful update", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      const mockNavigate = jest.fn();
      useNavigate.mockReturnValue(mockNavigate);

      renderUpdateProduct();

      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "UPDATE PRODUCT",
        }),
      );

      await waitFor(() =>
        expect(axios.put).toHaveBeenCalledWith(
          `/api/v1/product/update-product/${data._id}`,
          expect.any(FormData),
        ),
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Product Updated Successfully",
      );
    });

    it("should show error toast if update fails", async () => {
      axios.put.mockResolvedValue({
        data: { success: false, message: "Update Failed" },
      });

      renderUpdateProduct();
      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "UPDATE PRODUCT",
        }),
      );

      await waitFor(() =>
        expect(axios.put).toHaveBeenCalledWith(
          `/api/v1/product/update-product/${data._id}`,
          expect.any(FormData),
        ),
      );
      expect(toast.error).toHaveBeenCalledWith("Update Failed");
    });

    it("should show error toast if update request fails", async () => {
      axios.put.mockRejectedValue(new Error("Network Error"));

      renderUpdateProduct();
      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "UPDATE PRODUCT",
        }),
      );

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

  describe("(Delete)", () => {
    it("should show confirmation prompt", async () => {
      window.prompt = jest.fn().mockReturnValue(null);

      renderUpdateProduct();
      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "DELETE PRODUCT",
        }),
      );

      expect(window.prompt).toHaveBeenCalledWith(
        "Are you sure want to delete this product?",
      );
    });

    it("should not call delete API if user cancels deletion", async () => {
      window.prompt = jest.fn().mockReturnValue(null);
      axios.delete.mockResolvedValue({ data: { success: true } });

      renderUpdateProduct();
      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "DELETE PRODUCT",
        }),
      );
      expect(axios.delete).not.toHaveBeenCalled();
    });

    it("should call delete API and navigate on successful deletion", async () => {
      window.prompt = jest.fn().mockReturnValue(true);
      axios.delete.mockResolvedValue({ data: { success: true } });
      const mockNavigate = jest.fn();
      useNavigate.mockReturnValue(mockNavigate);

      renderUpdateProduct();
      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "DELETE PRODUCT",
        }),
      );

      await waitFor(() =>
        expect(axios.delete).toHaveBeenCalledWith(
          `/api/v1/product/delete-product/${data._id}`,
        ),
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Product Deleted Successfully",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });

    it("should show error toast if delete fails", async () => {
      window.prompt = jest.fn().mockReturnValue(true);
      axios.delete.mockResolvedValue({
        data: { success: false, message: "Delete Failed" },
      });

      renderUpdateProduct();
      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "DELETE PRODUCT",
        }),
      );

      await waitFor(() => expect(axios.delete).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Delete Failed");
    });

    it("should show error toast if delete request fails", async () => {
      window.prompt = jest.fn().mockReturnValue(true);
      axios.delete.mockRejectedValue(new Error("Network Error"));

      renderUpdateProduct();
      await waitFor(() => screen.findByDisplayValue(data.name));

      fireEvent.click(
        await screen.findByRole("button", {
          name: "DELETE PRODUCT",
        }),
      );

      await waitFor(() => expect(axios.delete).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });
});
