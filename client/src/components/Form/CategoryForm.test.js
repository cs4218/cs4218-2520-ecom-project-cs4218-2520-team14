// Jonas Ong, A0252052U

import { fireEvent, render, screen } from "@testing-library/react";
import CategoryForm from "./CategoryForm";
import React from "react";

describe("Category Form Component", () => {
  it("should render the form correctly", () => {
    const handleSubmit = jest.fn();
    const setValue = jest.fn();
    const value = "";

    render(
      <CategoryForm
        handleSubmit={handleSubmit}
        value={value}
        setValue={setValue}
      />,
    );

    expect(
      screen.getByPlaceholderText("Enter new category"),
    ).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("should initialise with empty input", () => {
    const handleSubmit = jest.fn();
    const setValue = jest.fn();
    const value = "";

    render(
      <CategoryForm
        handleSubmit={handleSubmit}
        value={value}
        setValue={setValue}
      />,
    );

    expect(screen.getByPlaceholderText("Enter new category").value).toBe("");
  });

  it("should handle form submission correctly", async () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    const setValue = jest.fn();
    const value = "New Category";

    render(
      <CategoryForm
        handleSubmit={handleSubmit}
        value={value}
        setValue={setValue}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
      target: { value: "Updated Category" },
    });
    expect(setValue).toHaveBeenCalledWith("Updated Category");

    fireEvent.click(screen.getByText("Submit"));
    expect(handleSubmit).toHaveBeenCalled();
  });
});
