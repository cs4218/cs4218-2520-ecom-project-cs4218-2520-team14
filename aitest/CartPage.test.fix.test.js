jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));
jest.mock("braintree-web-drop-in-react", () => {
  const MockDropIn = ({ onInstance }) => {
    // Simulate the onInstance prop being called with a mock instance
    // This allows us to control the `instance` state in CartPage
    if (onInstance) {
      onInstance({
        requestPaymentMethod: jest.fn(() => ({
          nonce: "mock-nonce"
        }))
      });
    }
    return <div data-testid="braintree-dropin" />;
  };
  return MockDropIn;
});

// Mock the Layout component
jest.mock("./../components/Layout", () => {
  const MockLayout = ({ children }) => (
    <div data-testid="layout">{children}</div>
  );
  return MockLayout;
});

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CartPage from "../client/src/pages/CartPage"; // Adjust path as necessary
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

// Helper function to render component with mocked contexts
const renderWithContexts = (
  authValue = [null, jest.fn()],
  cartValue = [[], jest.fn()]
) => {
  useAuth.mockReturnValue(authValue);
  useCart.mockReturnValue(cartValue);
  return render(<CartPage />);
};

describe("CartPage", () => {
  const mockNavigate = jest.fn();
  const mockSetAuth = jest.fn();
  const mockSetCart = jest.fn();

  // Mock product data
  const mockProducts = [
    {
      _id: "p1",
      name: "Product One",
      description: "Description for product one",
      price: 100,
    },
    {
      _id: "p2",
      name: "Product Two",
      description: "Description for product two, quite long",
      price: 250,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue([{ user: null, token: null }, mockSetAuth]);
    useCart.mockReturnValue([[], mockSetCart]); // Default empty cart
    axios.get.mockResolvedValue({ data: { clientToken: "mockClientToken" } });
    axios.post.mockResolvedValue({ data: { ok: true } });

    // Reset process.env for each test
    process.env = {
      ...process.env,
      REACT_APP_MODE: undefined, // Default to not test mode
    };
  });

  // --- Rendering & Initial State Tests ---
  it("should render 'Hello Guest' and 'Your Cart Is Empty' when not authenticated and cart is empty", () => {
    renderWithContexts();
    expect(screen.getByText("Hello Guest")).toBeInTheDocument();
    expect(screen.getByText("Your Cart Is Empty")).toBeInTheDocument();
  });

  it("should render 'Hello [User Name]' and cart message when authenticated with items", () => {
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = mockProducts;
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    expect(screen.getByText(`Hello ${auth.user.name}`)).toBeInTheDocument();
    expect(
      screen.getByText(`You Have ${cart.length} items in your cart`)
    ).toBeInTheDocument();
  });

  it("should display 'please login to checkout !' message when cart has items but user is not logged in", () => {
    const auth = { user: null, token: null };
    const cart = mockProducts;
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    expect(
      screen.getByText("please login to checkout !")
    ).toBeInTheDocument();
  });

  it("should render cart items when cart is not empty", () => {
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = mockProducts;
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    expect(screen.getByText("Product One")).toBeInTheDocument();
    expect(screen.getByText("Product Two")).toBeInTheDocument();
    expect(screen.getAllByTestId("cart-item")).toHaveLength(cart.length);
  });

  it("should display total price correctly", () => {
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = mockProducts; // total 350
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    expect(screen.getByText("Total : $350.00")).toBeInTheDocument();
  });

  it("should display 'Current Address' and 'Update Address' button if user has an address", () => {
    const auth = {
      user: { name: "Test User", address: "123 Test St" },
      token: "abc",
    };
    renderWithContexts([auth, mockSetAuth]);
    expect(screen.getByText("Current Address")).toBeInTheDocument();
    expect(screen.getByText(auth.user.address)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update Address" })).toBeInTheDocument();
  });

  it("should display 'Update Address' button if user is logged in but has no address", () => {
    const auth = { user: { name: "Test User", address: null }, token: "abc" };
    renderWithContexts([auth, mockSetAuth]);
    expect(
      screen.getByRole("button", { name: "Update Address" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Current Address")).not.toBeInTheDocument();
  });

  it("should display 'Please Login to checkout' button if user is not logged in", () => {
    const auth = { user: null, token: null };
    renderWithContexts([auth, mockSetAuth]);
    expect(
      screen.getByRole("button", { name: "Please Login to checkout" })
    ).toBeInTheDocument();
  });

  // --- `removeCartItem` functionality ---
  it("should remove an item from the cart when 'Remove' button is clicked", () => {
    const cart = mockProducts;
    renderWithContexts([null, mockSetAuth], [cart, mockSetCart]);

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]); // Click on the first remove button

    const expectedCartAfterRemoval = [mockProducts[1]];
    expect(mockSetCart).toHaveBeenCalledWith(expectedCartAfterRemoval);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "cart",
      JSON.stringify(expectedCartAfterRemoval)
    );
  });

  // --- `getToken` (useEffect) functionality ---
  it("should fetch client token on component mount if auth token exists", async () => {
    const auth = { user: { name: "Test User" }, token: "abc" };
    renderWithContexts([auth, mockSetAuth]);

    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
    // Wait for the client token to be set, which will make DropIn appear
    await waitFor(() => {
      expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
    });
  });

  it("should not fetch client token on component mount if auth token does not exist", () => {
    const auth = { user: null, token: null };
    renderWithContexts([auth, mockSetAuth]);
    expect(axios.get).not.toHaveBeenCalled();
    expect(screen.queryByTestId("braintree-dropin")).not.toBeInTheDocument();
  });

  it("should handle error when fetching client token", async () => {
    axios.get.mockRejectedValue(new Error("Network error"));
    const auth = { user: { name: "Test User" }, token: "abc" };
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    renderWithContexts([auth, mockSetAuth]);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  // --- `handlePayment` functionality ---
  it("should display DropIn and Make Payment button when clientToken, auth.token, and cart.length are present", async () => {
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = mockProducts;
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    await waitFor(() => {
      expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Make Payment" })).toBeInTheDocument();
    });
  });

  it("should successfully handle payment when all conditions are met (not test mode)", async () => {
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = mockProducts;
    renderWithContexts(
      [auth, mockSetAuth],
      [cart, mockSetCart]
    );

    let instanceMock;
    // Simulate DropIn rendering and providing an instance
    await waitFor(() => {
      const dropInComponent = screen.getByTestId("braintree-dropin");
      // Directly call onInstance to get the mocked instance
      dropInComponent.props.onInstance({
        requestPaymentMethod: jest.fn(() => ({ nonce: "mock-nonce" })),
      });
      instanceMock = dropInComponent.props.onInstance.mock.calls[0][0];
    });

    const makePaymentButton = screen.getByRole("button", {
      name: "Make Payment",
    });
    fireEvent.click(makePaymentButton);

    await waitFor(() => {
      expect(makePaymentButton).toBeDisabled(); // Check loading state
      expect(makePaymentButton).toHaveTextContent("Processing ....");
    });

    await waitFor(() => {
      expect(instanceMock.requestPaymentMethod).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        { nonce: "mock-nonce", cart }
      );
      expect(mockSetCart).toHaveBeenCalledWith([]);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("cart");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
      expect(toast.success).toHaveBeenCalledWith("Payment Completed Successfully ");
      expect(makePaymentButton).not.toBeDisabled(); // Loading state reset
      expect(makePaymentButton).toHaveTextContent("Make Payment");
    });
  });

  it("should not call requestPaymentMethod and proceed with payment if REACT_APP_MODE is 'test'", async () => {
    process.env.REACT_APP_MODE = "test";
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = mockProducts;
    renderWithContexts(
      [auth, mockSetAuth],
      [cart, mockSetCart]
    );

    let instanceMock;
    await waitFor(() => {
      const dropInComponent = screen.getByTestId("braintree-dropin");
      dropInComponent.props.onInstance({
        requestPaymentMethod: jest.fn(() => ({ nonce: "mock-nonce" })),
      });
      instanceMock = dropInComponent.props.onInstance.mock.calls[0][0];
    });

    fireEvent.click(screen.getByRole("button", { name: "Make Payment" }));

    await waitFor(() => {
      expect(instanceMock.requestPaymentMethod).not.toHaveBeenCalled(); // Should not be called in test mode
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        { nonce: undefined, cart } // nonce will be undefined as requestPaymentMethod isn't called
      );
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("should handle payment failure", async () => {
    axios.post.mockRejectedValue(new Error("Payment failed"));
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = mockProducts;
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    let instanceMock;
    await waitFor(() => {
      const dropInComponent = screen.getByTestId("braintree-dropin");
      dropInComponent.props.onInstance({
        requestPaymentMethod: jest.fn(() => ({ nonce: "mock-nonce" })),
      });
      instanceMock = dropInComponent.props.onInstance.mock.calls[0][0];
    });

    fireEvent.click(screen.getByRole("button", { name: "Make Payment" }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByRole("button", { name: "Make Payment" })).not.toBeDisabled();
    });
    consoleSpy.mockRestore();
  });

  // --- Button disabled states ---
  it("Make Payment button should be disabled when auth token is missing", async () => {
    axios.get.mockResolvedValue({ data: { clientToken: "mockClientToken" } });
    const auth = { user: null, token: null }; // No token
    const cart = mockProducts;
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    // Give it a moment for the client token to potentially load (even though it won't)
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      screen.queryByTestId("braintree-dropin")
    ).not.toBeInTheDocument(); // DropIn should not be rendered
    expect(screen.queryByRole("button", { name: "Make Payment" })).not.toBeInTheDocument(); // Button not rendered if DropIn isn't there
  });

  it("Make Payment button should be disabled when cart is empty", async () => {
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    const cart = []; // Empty cart
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    // Give it a moment for the client token to potentially load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled(); // Token fetch would happen
    });

    // DropIn should not be rendered because cart is empty, so no payment button
    expect(
      screen.queryByTestId("braintree-dropin")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Make Payment" })).not.toBeInTheDocument();
  });

  it("Make Payment button should be disabled when user address is missing", async () => {
    const auth = { user: { name: "Test User", address: null }, token: "abc" }; // No address
    const cart = mockProducts;
    renderWithContexts([auth, mockSetAuth], [cart, mockSetCart]);

    await waitFor(() => {
      expect(screen.getByTestId("braintree-dropin")).toBeInTheDocument();
    });

    const makePaymentButton = screen.getByRole("button", { name: "Make Payment" });
    expect(makePaymentButton).toBeDisabled();
  });

  // Ensure navigation works as expected
  it("should navigate to profile page when 'Update Address' button is clicked", () => {
    const auth = { user: { name: "Test User", address: "123 Main St" }, token: "abc" };
    renderWithContexts([auth, mockSetAuth]);

    fireEvent.click(screen.getByRole("button", { name: "Update Address" }));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("should navigate to login page when 'Please Login to checkout' button is clicked", () => {
    const auth = { user: null, token: null };
    renderWithContexts([auth, mockSetAuth]);

    fireEvent.click(screen.getByRole("button", { name: "Please Login to checkout" }));
    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });

  // Test the Layout component rendering
  it("should render the Layout component", () => {
    renderWithContexts();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });
});
