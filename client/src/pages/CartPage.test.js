import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import CartPage from "./CartPage";
import { mockAuth, mockCartTotal, mockClientToken, mockItems, mockItemsLength } from "../tests/fixtures/test.cartpage.data";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";

jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
const mockSetCart = jest.fn();
const mockInstance = {
  requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "fake-nonce" }),
};

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [[], jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], mockSetCart]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));

jest.mock("braintree-web-drop-in-react", () => {
  const React = require("react");
  return function DummyDropIn({ onInstance }) {
    React.useEffect(() => {
      onInstance(mockInstance); // Mock instance
    }, [onInstance]);
    return <div>Mock Braintree Drop-in UI</div>;
  }
});

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe("CartPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should renders cart page (empty cart & no user)", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText("Hello Guest")).toBeInTheDocument();
    expect(getByText("Your Cart Is Empty")).toBeInTheDocument();
    expect(getByText("Please Login to checkout")).toBeInTheDocument();
  });

  it("should be able to navigate to login page when clicking login button", async () => {

    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    const loginButton = getByText("Please Login to checkout");
    fireEvent.click(loginButton);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });

  it("should render cart page with items in cart (Non-Auth)", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    useCart.mockReturnValue([mockItems, jest.fn()]);

    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText(`You Have ${mockItemsLength} items in your cart please login to checkout !`)).toBeInTheDocument();
    expect(getByText(mockItems[0].name)).toBeInTheDocument();
  });

  it("should remove item in cart (success)", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    useCart.mockReturnValue([mockItems, mockSetCart]);

    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    const removeButton = getByText("Remove");
    fireEvent.click(removeButton);

    expect(mockSetCart).toHaveBeenCalledTimes(1);
    expect(window.localStorage.setItem).toHaveBeenCalledWith("cart", JSON.stringify([]));
  });

  it("should handle remove item in cart (logs error)", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const storageError = new Error("LocalStorage Error");
    useCart.mockReturnValue([mockItems, mockSetCart]);
    window.localStorage.setItem.mockImplementation(() => {
      throw storageError;
    });
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    const removeButton = getByText("Remove");
    fireEvent.click(removeButton);
    expect(consoleSpy).toHaveBeenCalledWith(storageError);

    consoleSpy.mockRestore();
  });

  it("should handle total price calculation", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    useCart.mockReturnValue([mockItems, mockSetCart]);
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(getByText(`Total : ${mockCartTotal}`)).toBeInTheDocument();
  });

  it("should handle total price calculation (logs error)", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    const localeError = new Error("toLocaleString Error");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const localeSpy = jest.spyOn(Number.prototype, "toLocaleString").mockImplementation(() => {
      throw localeError;
    });

    useCart.mockReturnValue([mockItems, mockSetCart]);
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(localeSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(localeError);
    consoleSpy.mockRestore();
    localeSpy.mockRestore();
  });

  it("should render cart page with items in cart (Auth User)", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);

    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText(`Hello ${mockAuth.user.name}`)).toBeInTheDocument();
    expect(getByText(`You Have ${mockItemsLength} items in your cart`)).toBeInTheDocument();
    expect(getByText(mockAuth.user.address)).toBeInTheDocument();
  });

  it("should be able to navigate to update address page when clicking update address button", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    const updateAddressButton = getByText("Update Address");
    fireEvent.click(updateAddressButton);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("should be able to navigate to update address page when clicking update address button (No address)", async () => {
    axios.get.mockReturnValue(Promise.resolve([]));
    useAuth.mockReturnValue([{ token: mockAuth.token }, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    const updateAddressButton = getByText("Update Address");
    fireEvent.click(updateAddressButton);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("render checkout page with client token", async () => {
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      console.log(url);
      return Promise.resolve([]);
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");

    await waitFor(() => expect(getByText("Mock Braintree Drop-in UI")).toBeInTheDocument());
    expect(getByText("Make Payment")).toBeInTheDocument();
  });


  it("should get client token (logs error)", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const tokenError = new Error("Token Fetch Error");
    axios.get.mockRejectedValue(tokenError);

    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(consoleSpy).toHaveBeenCalledWith(tokenError);
    consoleSpy.mockRestore();
  });

  it("should handle payment (success)", async () => {
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      console.log(url);
      return Promise.resolve([]);
    });
    axios.post.mockResolvedValueOnce([]);

    const { findByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(findByText("Make Payment")).toBeDefined());
    const makePaymentButton = await findByText("Make Payment");
    fireEvent.click(makePaymentButton);

    expect(mockInstance.requestPaymentMethod).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        { nonce: "fake-nonce", cart: mockItems },
      )
    );
    expect(localStorage.removeItem).toHaveBeenCalledWith("cart");
    expect(mockSetCart).toHaveBeenCalledWith([]);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
    expect(toast.success).toHaveBeenCalledWith("Payment Completed Successfully ");
  });

  it("should handle payment (logs error)", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      console.log(url);
      return Promise.resolve([]);
    });
    const paymentError = new Error("Payment Error");
    axios.post.mockRejectedValue(paymentError);
    const { findByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(findByText("Make Payment")).toBeDefined());
    const makePaymentButton = await findByText("Make Payment");
    fireEvent.click(makePaymentButton);
    expect(mockInstance.requestPaymentMethod).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(consoleSpy).toHaveBeenCalledWith(paymentError);
    consoleSpy.mockRestore();
  });
});