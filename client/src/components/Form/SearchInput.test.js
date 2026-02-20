//Teng Hui Xin Alicia, A0259064Y
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import SearchInput from "./SearchInput";

jest.mock("axios");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockSetValues = jest.fn();
const mockUseSearch = jest.fn();

jest.mock("../../context/search", () => ({
  useSearch: () => mockUseSearch(),
}));

describe("SearchInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearch.mockReturnValue([
      { keyword: "", results: [] },
      mockSetValues,
    ]);
  });

  it("renders input and Search button", () => {
    render(<SearchInput />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("updates keyword in context on typing", () => {
    render(<SearchInput />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "chair" },
    });

    expect(mockSetValues).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "chair" }),
    );
  });

  it("does not search or navigate when keyword is only whitespace", async () => {
    mockUseSearch.mockReturnValue([
      { keyword: "    ", results: [] },
      mockSetValues,
    ]);

    render(<SearchInput />);

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("trims leading/trailing whitespace before search", async () => {
    const values = { keyword: "    a", results: [] };
    mockUseSearch.mockReturnValue([values, mockSetValues]);

    axios.get.mockResolvedValueOnce({ data: [{ _id: "p1", name: "A item" }] });

    render(<SearchInput />);

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/a");
    });

    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  it("encodes special characters in keyword when calling search", async () => {
    const values = { keyword: "men/women & kids", results: [] };
    mockUseSearch.mockReturnValue([values, mockSetValues]);

    axios.get.mockResolvedValueOnce({ data: [] });

    render(<SearchInput />);

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    const encoded = encodeURIComponent("men/women & kids");

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/search/${encoded}`,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  it("submits search, stores results and navigates to /search", async () => {
    const values = { keyword: "chair", results: [] };
    mockUseSearch.mockReturnValue([values, mockSetValues]);

    const apiResults = [{ _id: "p1", name: "Chair" }];
    axios.get.mockResolvedValueOnce({ data: apiResults });

    render(<SearchInput />);

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/chair");
    });

    expect(mockSetValues).toHaveBeenCalledWith({
      ...values,
      results: apiResults,
    });

    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  it("logs error and does not navigate when API fails", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const values = { keyword: "chair", results: [] };
    mockUseSearch.mockReturnValue([values, mockSetValues]);

    axios.get.mockRejectedValueOnce(new Error("Network error"));

    render(<SearchInput />);

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/chair");
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
