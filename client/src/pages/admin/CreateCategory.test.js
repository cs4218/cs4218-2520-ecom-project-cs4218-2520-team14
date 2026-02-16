import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  act,
  waitForElementToBeRemoved,
} from "@testing-library/react";

import CreateCategory from "./CreateCategory";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import React from "react";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));
jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));
jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <main>{children}</main>
));

const renderCreateCategory = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
      <Routes>
        <Route
          path="/dashboard/admin/create-category"
          element={<CreateCategory />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("CreateCategory Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("(Fetching)", () => {
    it("should render correctly", async () => {
      axios.get.mockResolvedValue({ data: { category: [] } });
      renderCreateCategory();

      await screen.findByText("Manage Category");
    });

    it("should render categories correctly if categories exist", async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: [
            { _id: 0, name: "TestCategory" },
            { _id: 1, name: "TestCategory2" },
          ],
        },
      });

      renderCreateCategory();

      expect(await screen.findAllByText("Edit")).toHaveLength(2);
      expect(await screen.findAllByText("Delete")).toHaveLength(2);
      await screen.findByText("TestCategory");
      await screen.findByText("TestCategory2");
      await screen.findByText("Submit");
    });

    it("should show error toast if fetching categories fails", async () => {
      axios.get.mockRejectedValue(new Error("Network Error"));

      renderCreateCategory();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting category",
      );
    });
  });

  describe("(Create)", () => {
    it("should correctly create a new category", async () => {
      axios.get.mockResolvedValue({ data: { category: [] } });
      axios.post.mockResolvedValue({ data: { success: true } });

      renderCreateCategory();

      fireEvent.change(
        await screen.findByPlaceholderText("Enter new category"),
        { target: { value: "NewCategory" } },
      );
      fireEvent.click(await screen.findByText("Submit"));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "NewCategory" },
        ),
      );
      expect(toast.success).toHaveBeenCalledWith("NewCategory is created");
    });

    it("should render new category after creation", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { category: [] } })
        .mockResolvedValueOnce({
          data: { success: true, category: [{ _id: 0, name: "NewCategory" }] },
        });
      axios.post.mockResolvedValue({ data: { success: true } });

      renderCreateCategory();

      fireEvent.change(
        await screen.findByPlaceholderText("Enter new category"),
        { target: { value: "NewCategory" } },
      );
      fireEvent.click(await screen.findByText("Submit"));

      await screen.findByText("NewCategory");
    });

    it("should show error toast if creating category fails", async () => {
      axios.post.mockRejectedValue(new Error("Network Error"));
      axios.get.mockResolvedValue({ data: { category: [] } });

      renderCreateCategory();

      fireEvent.change(
        await screen.findByPlaceholderText("Enter new category"),
        { target: { value: "NewCategory" } },
      );
      fireEvent.click(await screen.findByText("Submit"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in input form",
      );
    });

    it("should show error toast if creating category returns error response", async () => {
      axios.post.mockResolvedValue({
        data: { success: false, message: "Category already exists" },
      });
      axios.get.mockResolvedValue({ data: { category: [] } });

      renderCreateCategory();

      fireEvent.change(
        await screen.findByPlaceholderText("Enter new category"),
        { target: { value: "ExistingCategory" } },
      );
      fireEvent.click(await screen.findByText("Submit"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Category already exists");
    });
  });

  describe("(Update)", () => {
    // combined test due to act warnings when testing separately
    it("should correctly update a category and render updated category", async () => {
      const category = { _id: 0, name: "TestCategory" };
      axios.get
        .mockResolvedValueOnce({
          data: { success: true, category: [category] },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: [{ _id: 0, name: "UpdatedCategory" }],
          },
        });
      axios.put.mockResolvedValue({ data: { success: true } });

      renderCreateCategory();

      fireEvent.click(await screen.findByText("Edit"));
      fireEvent.change(await screen.findByDisplayValue("TestCategory"), {
        target: { value: "UpdatedCategory" },
      });

      const modal = await screen.findByTestId("update-category-modal");
      fireEvent.click(await within(modal).findByText("Submit"));

      await screen.findByText("UpdatedCategory");

      expect(axios.put).toHaveBeenCalledWith(
        `/api/v1/category/update-category/${category._id}`,
        { name: "UpdatedCategory" },
      );
      expect(toast.success).toHaveBeenCalledWith("UpdatedCategory is updated");
    });

    it("should show error toast if updating category fails", async () => {
      const category = { _id: 0, name: "TestCategory" };
      axios.get.mockResolvedValue({
        data: { success: true, category: [category] },
      });
      axios.put.mockRejectedValue(new Error("Network Error"));

      renderCreateCategory();

      fireEvent.click(await screen.findByText("Edit"));
      fireEvent.change(await screen.findByDisplayValue("TestCategory"), {
        target: { value: "UpdatedCategory" },
      });
      fireEvent.click(
        within(await screen.findByTestId("update-category-modal")).getByText(
          "Submit",
        ),
      );

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    it("should show error toast if updating category returns error response", async () => {
      const category = { _id: 0, name: "TestCategory" };
      axios.get.mockResolvedValue({
        data: { success: true, category: [category] },
      });
      axios.put.mockResolvedValue({
        data: { success: false, message: "Category not found" },
      });

      renderCreateCategory();

      fireEvent.click(await screen.findByText("Edit"));
      fireEvent.change(await screen.findByDisplayValue("TestCategory"), {
        target: { value: "UpdatedCategory" },
      });
      fireEvent.click(
        within(await screen.findByTestId("update-category-modal")).getByText(
          "Submit",
        ),
      );

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Category not found");
    });
  });

  describe("(Delete)", () => {
    // combined test due to act warnings when testing separately
    it("should correctly delete a category and render updated category list", async () => {
      const category = { _id: 0, name: "TestCategory" };
      axios.get
        .mockResolvedValueOnce({
          data: { success: true, category: [category] },
        })
        .mockResolvedValueOnce({
          data: { success: true, category: [] },
        });
      axios.delete.mockResolvedValue({ data: { success: true } });

      renderCreateCategory();

      fireEvent.click(await screen.findByText("Delete"));

      await waitForElementToBeRemoved(() => screen.queryByText("TestCategory"));

      expect(axios.delete).toHaveBeenCalledWith(
        `/api/v1/category/delete-category/${category._id}`,
      );
      expect(toast.success).toHaveBeenCalledWith("Category is deleted");
    });

    it("should show error toast if deleting category fails", async () => {
      const category = { _id: 0, name: "TestCategory" };
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [category] },
      });
      axios.delete.mockRejectedValue(new Error("Network Error"));

      renderCreateCategory();

      fireEvent.click(await screen.findByText("Delete"));

      await waitFor(() => expect(axios.delete).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    it("should show error toast if deleting category returns error response", async () => {
      const category = { _id: 0, name: "TestCategory" };
      axios.get.mockResolvedValue({
        data: { success: true, category: [category] },
      });
      axios.delete.mockResolvedValue({
        data: { success: false, message: "Category not found" },
      });

      renderCreateCategory();

      fireEvent.click(await screen.findByText("Delete"));

      await waitFor(() => expect(axios.delete).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Category not found");
    });
  });
});
