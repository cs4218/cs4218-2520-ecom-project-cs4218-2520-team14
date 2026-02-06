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

  it("should initialize with empty array", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current[0]).toEqual([]);
  });

  it("should load cart from localStorage", () => {
    const mockCart = [{ id: 1, name: "Product 1", quantity: 2 }];
    localStorage.setItem("cart", JSON.stringify(mockCart));
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current[0]).toEqual(mockCart);
  });

  it("should update cart when setCart is called", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const newItem = { id: 2, name: "Product 2", quantity: 1 };
    act(() => {
      result.current[1](newItem);
    });

    expect(result.current[0]).toEqual(newItem);
  });
});