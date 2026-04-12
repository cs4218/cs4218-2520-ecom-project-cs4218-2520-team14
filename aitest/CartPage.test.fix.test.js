import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartPage from './CartPage';

// Mock child components and hooks
jest.mock('./../components/Layout', () => {
  const MockLayout = ({ children }) => <div data-testid="layout">{children}</div>;
  MockLayout.displayName = 'Layout';
  return MockLayout;
});

// Mock DropIn from braintree-web-drop-in-react
// Use useLayoutEffect to ensure onInstance is called synchronously after mount
jest.mock('braintree-web-drop-in-react', () => {
  const MockDropIn = ({ options, onInstance }) => {
    React.useLayoutEffect(() => {
      if (onInstance) {
        // Simulate a Braintree instance with a mock requestPaymentMethod
        onInstance({
          requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'test_nonce' }),
        });
      }
    }, [onInstance]); // Dependency array for useLayoutEffect
    return <div data-testid="drop-in" data-authorization={options?.authorization}></div>;
  };
  MockDropIn.displayName = 'DropIn';
  return MockDropIn;
});

// Mock useCart hook
const mockSetCart = jest.fn();
const mockUseCart = jest.fn(() => [[], mockSetCart]); // Default: empty cart
jest.mock('../context/cart', () => ({
  useCart: () => mockUseCart(),
}));

// Mock useAuth hook
const mockSetAuth = jest.fn();
const mockUseAuth = jest.fn(() => [{}, mockSetAuth]); // Default: no auth user
jest.mock('../context/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock axios
import axios from 'axios';
jest.mock('axios');

// Mock react-hot-toast
import toast from 'react-hot-toast';
jest.mock('react-hot-toast');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// --- MOCK DATA ---
const mockAuthUser = {
  user: {
    name: 'Test User',
    address: '123 Test St',
  },
  token: 'test_token',
};

const mockAuthUserNoAddress = {
  user: {
    name: 'Test User',
  },
  token: 'test_token',
};

const mockEmptyCart = [];
const mockCartWithItems = [
  { _id: '1', name: 'Product 1', description: 'Desc 1', price: 100, quantity: 1 },
  { _id: '2', name: 'Product 2', description: 'Desc 2', price: 50, quantity: 1 },
];

describe('CartPage', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env; // Save original process.env
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
    localStorageMock.clear(); // Clear local storage before each test

    // Reset default mock implementations for hooks and external libraries
    mockUseAuth.mockReturnValue([{}, mockSetAuth]);
    mockUseCart.mockReturnValue([mockEmptyCart, mockSetCart]);
    axios.get.mockResolvedValue({ data: { clientToken: 'mock_client_token' } });
    axios.post.mockResolvedValue({ data: { ok: true } });
    toast.success.mockImplementation(jest.fn());
    mockNavigate.mockImplementation(jest.fn());

    // Reset process.env for each test to avoid leakage
    process.env = { ...originalEnv, REACT_APP_MODE: undefined }; // Ensure not in test mode by default
  });

  afterAll(() => {
    process.env = originalEnv; // Restore original process.env
  });


  // --- RENDERING AND INITIAL STATE TESTS ---
  describe('Rendering and initial state', () => {
    it('should render "Hello Guest" and "Your Cart Is Empty" when no user and empty cart', () => {
      render(<CartPage />);
      expect(screen.getByText('Hello Guest')).toBeInTheDocument();
      expect(screen.getByText('Your Cart Is Empty')).toBeInTheDocument();
      expect(screen.queryByText(/You Have \d+ items/)).not.toBeInTheDocument();
    });

    it('should render "Hello Guest" and "please login to checkout !" when no user but cart has items', () => {
      mockUseCart.mockReturnValue([mockCartWithItems, mockSetCart]);
      render(<CartPage />);
      expect(screen.getByText('Hello Guest')).toBeInTheDocument();
      expect(screen.getByText(/You Have 2 items in your cart please login to checkout !/)).toBeInTheDocument();
      expect(screen.queryByText('Your Cart Is Empty')).not.toBeInTheDocument();
    });

    it('should render "Hello [User Name]" when user is logged in', () => {
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]);
      render(<CartPage />);
      expect(screen.getByText(`Hello ${mockAuthUser.user.name}`)).toBeInTheDocument();
    });

    it('should display cart items when present', () => {
      mockUseCart.mockReturnValue([mockCartWithItems, mockSetCart]);
      render(<CartPage />);
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getAllByTestId('cart-item')).toHaveLength(2);
    });

    it('should display cart summary section', () => {
      render(<CartPage />);
      expect(screen.getByRole('heading', { name: /Cart Summary/i })).toBeInTheDocument();
      expect(screen.getByText(/Total \| Checkout \| Payment/i)).toBeInTheDocument();
      expect(screen.getByText(/Total : \$0.00/i)).toBeInTheDocument(); // Initially 0 with empty cart
    });

    it('should display "Current Address" and "Update Address" button if user has an address', () => {
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]);
      render(<CartPage />);
      expect(screen.getByRole('heading', { name: /Current Address/i })).toBeInTheDocument();
      expect(screen.getByText(mockAuthUser.user.address)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update Address/i })).toBeInTheDocument();
    });

    it('should display "Update Address" button if logged in but no address set', () => {
      mockUseAuth.mockReturnValue([mockAuthUserNoAddress, mockSetAuth]);
      render(<CartPage />);
      expect(screen.getByRole('button', { name: /Update Address/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Current Address/i })).not.toBeInTheDocument();
    });

    it('should display "Please Login to checkout" button if not logged in', () => {
      render(<CartPage />); // Default: no auth user
      expect(screen.getByRole('button', { name: /Please Login to checkout/i })).toBeInTheDocument();
    });

    it('should not show DropIn component or payment button if clientToken is not available', async () => {
      axios.get.mockResolvedValueOnce({ data: { clientToken: null } }); // Simulate no token initially
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]);
      mockUseCart.mockReturnValue([mockCartWithItems, mockSetCart]);

      render(<CartPage />);
      // Axios call for token happens on mount, wait for it
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Make Payment/i })).not.toBeInTheDocument();
    });
  });

  // --- totalPrice FUNCTION TESTS ---
  describe('totalPrice calculation', () => {
    it('should return $0.00 for an empty cart', () => {
      mockUseCart.mockReturnValue([mockEmptyCart, mockSetCart]);
      render(<CartPage />);
      expect(screen.getByText(/Total : \$0.00/i)).toBeInTheDocument();
    });

    it('should correctly calculate total price for items in the cart', () => {
      mockUseCart.mockReturnValue([mockCartWithItems, mockSetCart]); // Total = 100 + 50 = 150
      render(<CartPage />);
      expect(screen.getByText(/Total : \$150.00/i)).toBeInTheDocument();
    });

    it('should handle large numbers correctly', () => {
      const largePriceCart = [
        { _id: '3', name: 'Product 3', description: 'Desc 3', price: 9999.99, quantity: 1 },
      ];
      mockUseCart.mockReturnValue([largePriceCart, mockSetCart]);
      render(<CartPage />);
      expect(screen.getByText(/Total : \$9,999.99/i)).toBeInTheDocument();
    });
  });

  // --- removeCartItem FUNCTION TESTS ---
  describe('removeCartItem functionality', () => {
    it('should remove a specific item from the cart when remove button is clicked', () => {
      mockUseCart.mockReturnValue([mockCartWithItems, mockSetCart]);
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]); // Needed for rendering, not directly for removeCartItem
      render(<CartPage />);

      const removeButtonForProduct1 = screen.getAllByRole('button', { name: /Remove/i })[0]; // Assuming order is consistent
      fireEvent.click(removeButtonForProduct1);

      const expectedCartAfterRemoval = [{ _id: '2', name: 'Product 2', description: 'Desc 2', price: 50, quantity: 1 }];
      expect(mockSetCart).toHaveBeenCalledWith(expectedCartAfterRemoval);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('cart', JSON.stringify(expectedCartAfterRemoval));
    });

    // NOTE: The source code has a bug where `splice(index, 1)` removes the last item if `index` is -1 (i.e., item not found).
    // This scenario is not easily testable via UI interaction as a 'remove' button for a non-existent item wouldn't exist.
    // Testing the correct removal of an existing item covers the intended functionality.
  });

  // --- getToken FUNCTION TESTS (useEffect) ---
  describe('getToken and useEffect', () => {
    it('should call axios.get to fetch client token on component mount (if auth token exists)', async () => {
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]);
      mockUseCart.mockReturnValue([mockCartWithItems, mockSetCart]); // Cart with items to enable payment section for DropIn

      axios.get.mockResolvedValueOnce({ data: { clientToken: 'initial_client_token' } });

      render(<CartPage />);

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');

      // Wait for clientToken state to update and DropIn to render with the token
      await waitFor(() => {
        expect(screen.getByTestId('drop-in')).toHaveAttribute('data-authorization', 'initial_client_token');
      });
    });

    it('should not call axios.get if auth token is not present', () => {
      mockUseAuth.mockReturnValue([{ user: { name: 'Test User' }, token: null }, mockSetAuth]); // No token
      render(<CartPage />);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should handle error when fetching client token', async () => {
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]);
      axios.get.mockRejectedValueOnce(new Error('Failed to get token'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.log

      render(<CartPage />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });
      consoleSpy.mockRestore();
    });
  });

  // --- handlePayment FUNCTION TESTS ---
  describe('handlePayment functionality', () => {
    // Helper function to render component under conditions that allow payment processing
    const setupPaymentConditions = async (authUser, cartItems) => {
      mockUseAuth.mockReturnValue([authUser, mockSetAuth]);
      mockUseCart.mockReturnValue([cartItems, mockSetCart]);
      axios.get.mockResolvedValue({ data: { clientToken: 'mock_client_token' } }); // Ensure client token is available

      render(<CartPage />);

      // Wait for useEffect to fetch token and DropIn to initialize the instance
      await waitFor(() => {
        expect(screen.getByTestId('drop-in')).toBeInTheDocument();
        // The DropIn mock automatically sets the instance via onInstance prop.
        // The button should be enabled unless specific conditions (loading, no address) apply.
      }, { timeout: 2000 }); // Increase timeout if needed for async mocks
    };

    it('should process payment successfully when all conditions are met', async () => {
      await setupPaymentConditions(mockAuthUser, mockCartWithItems);

      const makePaymentButton = screen.getByRole('button', { name: /Make Payment/i });
      expect(makePaymentButton).not.toBeDisabled(); // Should be enabled after setup

      fireEvent.click(makePaymentButton);

      await waitFor(() => {
        // Assert the behavior of the mocked Braintree instance's requestPaymentMethod
        // This is implicitly checked because the mock is configured in the DropIn component
        // expect(mockInstance.requestPaymentMethod).toHaveBeenCalledTimes(1); // Direct instance is not exposed easily
        expect(axios.post).toHaveBeenCalledWith('/api/v1/product/braintree/payment', {
          nonce: 'test_nonce', // From DropIn mock
          cart: mockCartWithItems,
        });
        expect(screen.getByText('Processing ....')).toBeInTheDocument(); // Check loading state
      });

      await waitFor(() => { // Wait for loading state to finish and success message
        expect(screen.queryByText('Processing ....')).not.toBeInTheDocument();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('cart');
        expect(mockSetCart).toHaveBeenCalledWith([]);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
        expect(toast.success).toHaveBeenCalledWith('Payment Completed Successfully ');
      });
    });

    it('should disable payment button if not logged in', async () => {
      mockUseAuth.mockReturnValue([{}, mockSetAuth]); // No auth user
      mockUseCart.mockReturnValue([mockCartWithItems, mockSetCart]);
      render(<CartPage />);
      // DropIn and Make Payment button should not be present
      await waitFor(() => {
        expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Make Payment/i })).not.toBeInTheDocument();
      });
    });

    it('should disable payment button if cart is empty', async () => {
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]);
      mockUseCart.mockReturnValue([mockEmptyCart, mockSetCart]); // Empty cart
      render(<CartPage />);
      // DropIn and Make Payment button should not be present
      await waitFor(() => {
        expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Make Payment/i })).not.toBeInTheDocument();
      });
    });

    it('should disable payment button if user has no address', async () => {
      await setupPaymentConditions(mockAuthUserNoAddress, mockCartWithItems); // User with no address

      const makePaymentButton = screen.getByRole('button', { name: /Make Payment/i });
      expect(makePaymentButton).toBeDisabled();
    });


    it('should handle payment error gracefully', async () => {
      await setupPaymentConditions(mockAuthUser, mockCartWithItems);

      axios.post.mockRejectedValueOnce(new Error('Payment failed')); // Make axios post fail
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const makePaymentButton = screen.getByRole('button', { name: /Make Payment/i });
      fireEvent.click(makePaymentButton);

      await waitFor(() => {
        expect(screen.getByText('Processing ....')).toBeInTheDocument(); // Check loading state
        // After error, loading should be false and console.log should be called
      });

      await waitFor(() => {
        expect(screen.queryByText('Processing ....')).not.toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(localStorageMock.removeItem).not.toHaveBeenCalled(); // Should not clear cart
        expect(mockSetCart).not.toHaveBeenCalledWith([]); // Should not clear cart
        expect(mockNavigate).not.toHaveBeenCalled(); // Should not navigate
        expect(toast.success).not.toHaveBeenCalled(); // Should not show success toast
      });
      consoleSpy.mockRestore();
    });

    it('should skip requestPaymentMethod in test mode and proceed with payment', async () => {
      process.env.REACT_APP_MODE = 'test';
      await setupPaymentConditions(mockAuthUser, mockCartWithItems);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const makePaymentButton = screen.getByRole('button', { name: /Make Payment/i });
      fireEvent.click(makePaymentButton);

      await waitFor(() => {
        // DropIn's requestPaymentMethod should not be called
        // Since `DropIn` mock uses `onInstance` which sets `requestPaymentMethod` on an instance,
        // we can check if `axios.post` receives `nonce: undefined` to confirm skipping.
        expect(consoleSpy).toHaveBeenCalledWith("Running in test mode, skipping payment processing");
        expect(axios.post).toHaveBeenCalledWith('/api/v1/product/braintree/payment', {
          nonce: undefined, // Nonce will be undefined in test mode
          cart: mockCartWithItems,
        });
        expect(toast.success).toHaveBeenCalledWith('Payment Completed Successfully ');
      });
      consoleSpy.mockRestore();
    });
  });

  // --- NAVIGATION TESTS ---
  describe('Navigation', () => {
    it('should navigate to profile page when "Update Address" button is clicked', () => {
      mockUseAuth.mockReturnValue([mockAuthUser, mockSetAuth]); // User with address
      render(<CartPage />);
      fireEvent.click(screen.getByRole('button', { name: /Update Address/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/profile');
    });

    it('should navigate to login page when "Please Login to checkout" button is clicked', () => {
      render(<CartPage />); // Default: no auth user
      fireEvent.click(screen.getByRole('button', { name: /Please Login to checkout/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: '/cart' });
    });
  });
});