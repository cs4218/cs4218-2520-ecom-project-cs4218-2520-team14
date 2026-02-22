// Chia York Lim, A0258147X
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import CartPage from "./CartPage";
import { mockAuth, mockCartTotal, mockClientToken, mockItems, mockItemsLength, mockSingleCartTotal, mockSingleItem } from "../tests/fixtures/test.cartpage.data";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";

jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
const mockSetCart = jest.fn();
const mockInstance = { requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "fake-nonce" }) };

const MockDropIn = jest.fn(({ onInstance }) => {
  const React = require("react");
  React.useEffect(() => {
    onInstance(mockInstance);
  }, [onInstance]);
  return <div>Mock Braintree Drop-in UI</div>;
});

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], mockSetCart]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));

jest.mock("braintree-web-drop-in-react", () => (props) => MockDropIn(props));

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
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);
  });

  it("should renders cart page (empty cart & no user)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(getByText("Hello Guest")).toBeInTheDocument();
    expect(getByText("Your Cart Is Empty")).toBeInTheDocument();
    expect(getByText("Please Login to checkout")).toBeInTheDocument();
  });

  it("should render cart page with items in cart (Non-Auth), No payment section", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useCart.mockReturnValue([mockItems, jest.fn()]);

    // Act
    const { getByText, getAllByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(getByText(`You Have ${mockItemsLength} items in your cart please login to checkout !`)).toBeInTheDocument();
    expect(getByText(`Total : ${mockCartTotal}`)).toBeInTheDocument();
    expect(getAllByText("Remove")).toHaveLength(2);
    expect(getByText("Please Login to checkout")).toBeInTheDocument();
    expect(() => getByText("Mock Braintree Drop-in UI")).toThrow(); // Payment section should not be rendered
  });

  it("should show user name in greeting when authenticated user has no address", async () => {
    // Arrange
    const authWithNoAddress = { token: mockAuth.token, user: { name: mockAuth.user.name } };
    useAuth.mockReturnValue([authWithNoAddress, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockReturnValue([]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => { });

    // Assert
    expect(getByText(`Hello ${mockAuth.user.name}`)).toBeInTheDocument();
    expect(getByText('Update Address')).toBeInTheDocument();
  });

  it("should truncate long description of cart item", async () => {
    // Arrange
    const longDescItem = {
      ...mockItems[0],
      description: "This is a very long description that should be truncated in the cart page to ensure that it does not overflow the UI and maintains a clean appearance for the user."
    };
    axios.get.mockReturnValue([]);
    useCart.mockReturnValue([[longDescItem], jest.fn()]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    const truncatedDesc = "This is a very long descriptio";
    expect(getByText(truncatedDesc)).toBeInTheDocument();
  });

  it.each([
    ["missing description", { _id: "1", name: "Test Product", price: 10, description: null }],
    ["missing name", { _id: "1", name: null, price: 10, description: "A description" }],
    ["missing price", { _id: "1", name: "Test Product", price: null, description: "A description" }],
    ["missing id", { _id: null, name: "Test Product", price: 10, description: "A description" }],
  ])("should render cart item gracefully when %s", async (_, item) => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    try {
      useCart.mockReturnValue([[item], jest.fn()]);
      axios.get.mockReturnValue([]);

      // Act
      render(
        <MemoryRouter initialEntries={["/cart"]}>
          <Routes>
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </MemoryRouter>
      )
      await waitFor(() => { });

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("should be able to navigate to login page when clicking login button", async () => {
    // Arrange
    axios.get.mockReturnValue([]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });
    const loginButton = getByText("Please Login to checkout");
    fireEvent.click(loginButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });

  it("should remove item in cart (success, multiple items)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useCart.mockReturnValue([mockItems, mockSetCart]);

    // Act
    const { getAllByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => { });
    const removeButtons = getAllByText("Remove");
    fireEvent.click(removeButtons[1]);

    // Assert
    expect(mockSetCart).toHaveBeenCalledTimes(1);
    expect(mockSetCart).toHaveBeenCalledWith([mockItems[0]]);
    expect(window.localStorage.setItem).toHaveBeenCalledWith("cart", JSON.stringify([mockItems[0]]));
  });

  it("should remove item in cart (success, single item)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useCart.mockReturnValue([mockSingleItem, mockSetCart]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => { });
    const removeButton = getByText("Remove");
    fireEvent.click(removeButton);

    // Assert
    expect(mockSetCart).toHaveBeenCalledTimes(1);
    expect(mockSetCart).toHaveBeenCalledWith([]);
    expect(window.localStorage.setItem).toHaveBeenCalledWith("cart", JSON.stringify([]));
  });

  it("should handle remove item in cart (logs error)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const storageError = new Error("LocalStorage Error");
    useCart.mockReturnValue([mockSingleItem, mockSetCart]);
    window.localStorage.setItem.mockImplementation(() => {
      throw storageError;
    });

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => { });
    const removeButton = getByText("Remove");
    fireEvent.click(removeButton);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(storageError);
    consoleSpy.mockRestore();
  });

  it("should handle total price calculation (empty cart)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useCart.mockReturnValue([[], jest.fn()]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(getByText("Total : $0.00")).toBeInTheDocument();
  });

  it("should handle total price calculation (single item)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useCart.mockReturnValue([mockSingleItem, jest.fn()]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(getByText(`Total : ${mockSingleCartTotal}`)).toBeInTheDocument();
  });

  it("should handle total price calculation", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useCart.mockReturnValue([mockItems, mockSetCart]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(getByText(`Total : ${mockCartTotal}`)).toBeInTheDocument();
  });

  it("should handle total price calculation (logs error)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    const localeError = new Error("toLocaleString Error");
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const localeSpy = jest.spyOn(Number.prototype, "toLocaleString").mockImplementation(() => {
      throw localeError;
    });
    useCart.mockReturnValue([mockItems, mockSetCart]);

    // Act
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(localeSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(localeError);
    consoleSpy.mockRestore();
    localeSpy.mockRestore();
  });

  it("should render cart page with items in cart (Auth User + Address)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(getByText(`Hello ${mockAuth.user.name}`)).toBeInTheDocument();
    expect(getByText(`You Have ${mockItemsLength} items in your cart`)).toBeInTheDocument();
    expect(getByText(mockAuth.user.address)).toBeInTheDocument();
  });

  it("should not render payment section with items no auth", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);

    // Act
    const { queryByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Assert
    expect(queryByText("Mock Braintree Drop-in UI")).not.toBeInTheDocument();
  });

  it("should be able to navigate to update address page when clicking update address button", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => { });
    const updateAddressButton = getByText("Update Address");
    fireEvent.click(updateAddressButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("should be able to navigate to update address page when clicking update address button (No address)", async () => {
    // Arrange
    axios.get.mockReturnValue([]);
    useAuth.mockReturnValue([{ token: mockAuth.token }, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => { });
    const updateAddressButton = getByText("Update Address");
    fireEvent.click(updateAddressButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("render checkout page with client token", async () => {
    // Arrange
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      return Promise.resolve([]);
    });

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert
    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
    await waitFor(() => expect(getByText("Mock Braintree Drop-in UI")).toBeInTheDocument());
    expect(getByText("Make Payment")).toBeInTheDocument();
    expect(getByText("Make Payment")).not.toBeDisabled();
  });

  it("button should be disabled when instance is not ready", async () => {
    // Arrange
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    MockDropIn.mockImplementationOnce(({ onInstance }) => <div>Mock Braintree Drop-in UI</div>);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      return Promise.resolve([]);
    });

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(getByText("Make Payment")).toBeInTheDocument());

    // Assert
    expect(getByText("Make Payment")).toBeDisabled();
  });

  it("button should be disabled when auth address is not available", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: mockAuth.token }, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      return Promise.resolve([]);
    });

    // Act
    const { getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(getByText("Make Payment")).toBeInTheDocument());

    // Assert
    expect(getByText("Make Payment")).toBeDisabled();
  });

  it("should get client token (success) on mount", async () => {
    // Arrange
    axios.get.mockImplementation(() => []);

    // Act
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token"));
  });

  it("should re-fetch client token when auth changes", async () => {
    // Arrange 1
    useAuth.mockReturnValue([{ user: "1", token: "1" },]);
    axios.get.mockResolvedValue([]);

    // Act 1
    const { rerender } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert 1
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token"));

    //Arrange 2
    axios.get.mockClear();
    axios.get.mockResolvedValue([]);

    // Act 2
    useAuth.mockReturnValue([{ user: "1", token: "2" },]);
    rerender(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert 2
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token"));
  });


  it("should get client token (logs error)", async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const tokenError = new Error("Token Fetch Error");
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/braintree/token") {
        return Promise.reject(tokenError);
      }
      return Promise.resolve([]);
    });

    // Act
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(tokenError));
    consoleSpy.mockRestore();
  });

  it("should handle payment (success)", async () => {
    // Arrange
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      return Promise.resolve([]);
    });
    axios.post.mockResolvedValueOnce([]);

    // Act
    const { findByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    const makePaymentButton = await findByText("Make Payment");
    fireEvent.click(makePaymentButton);

    // Assert
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
    // Arrange
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      return Promise.resolve([]);
    });
    const paymentError = new Error("Payment Error");
    axios.post.mockRejectedValue(paymentError);

    // Act
    const { findByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );
    const makePaymentButton = await findByText("Make Payment");
    fireEvent.click(makePaymentButton);

    // Assert
    expect(mockInstance.requestPaymentMethod).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(consoleSpy).toHaveBeenCalledWith(paymentError);
    consoleSpy.mockRestore();
  });

  it("it should show loading state when payment is processing", async () => {
    // Arrange
    useAuth.mockReturnValue([mockAuth, jest.fn()]);
    useCart.mockReturnValue([mockItems, mockSetCart]);
    axios.get.mockImplementation((url) => {
      if (url.includes("braintree/token"))
        return Promise.resolve({ data: mockClientToken });
      return Promise.resolve([]);
    });

    let resolvePayment;
    axios.post.mockImplementation(
      () => new Promise((resolve) => { resolvePayment = resolve; })
    );

    // Act
    const { findByText, getByText } = render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </MemoryRouter>
    );

    const makePaymentButton = await findByText("Make Payment");
    fireEvent.click(makePaymentButton);

    // Assert
    await waitFor(() => expect(getByText("Processing ....")).toBeInTheDocument());
    expect(getByText("Processing ....")).toBeDisabled();

    // Clean up
    await act(async () => { resolvePayment([]); });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders"));
    await waitFor(() => expect(getByText("Make Payment")).toBeInTheDocument());
  });
});