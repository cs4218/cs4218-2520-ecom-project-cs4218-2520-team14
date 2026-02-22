// Chia York Lim, A0258147X
import React from "react";
import { renderHook } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";
import { act } from "react-dom/test-utils";

describe("useCart Hook & CartProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

  it("should initialize with empty array (Empty localStorage)", () => {
    // Act
    const { result } = renderHook(() => useCart(), { wrapper });
    // Assert
    expect(result.current[0]).toEqual([]);
  });

  it("should load cart from localStorage", () => {
    // Arrange
    const mockCart = [{ id: 1, name: "Product 1", quantity: 2 }];
    localStorage.setItem("cart", JSON.stringify(mockCart));
    // Act
    const { result } = renderHook(() => useCart(), { wrapper });
    // Assert
    expect(result.current[0]).toEqual(mockCart);
  });

  it("should manage corrupted localStorage (not JSON)", () => {
    // Arrange
    localStorage.setItem("cart", "corrupted data");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    // Act
    const { result } = renderHook(() => useCart(), { wrapper });
    // Assert
    expect(result.current[0]).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith("Error parsing cart from localStorage:", expect.any(Error));
  });

  it("should manage corrupted localStorage (not an array)", () => {
    // Arrange
    localStorage.setItem("cart", JSON.stringify({ id: 1 }));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    // Act
    const { result } = renderHook(() => useCart(), { wrapper });
    // Assert
    expect(result.current[0]).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith("Error parsing cart from localStorage:", expect.any(Error));
  });

  it("should filter corrupted cart items (non-object)", () => {
    // Arrange
    const mockCart = [{ id: 1, name: "Product 1", quantity: 2 }, "corrupted item", null];
    localStorage.setItem("cart", JSON.stringify(mockCart));
    // Act
    const { result } = renderHook(() => useCart(), { wrapper });
    // Assert
    expect(result.current[0]).toEqual([{ id: 1, name: "Product 1", quantity: 2 }]);
  });

  it("should update cart when setCart is called", () => {
    // Arrange
    const { result } = renderHook(() => useCart(), { wrapper });
    const newItem = [{ id: 2, name: "Product 2", quantity: 1 }];
    // Act
    act(() => {
      result.current[1](newItem);
    });

    // Assert
    expect(result.current[0]).toEqual(newItem);
  });

  // Test for setCart to update localStorage can be added here if the implementation is updated to include that functionality.
  // Currently cart updates and localStorage is updated separately.
});