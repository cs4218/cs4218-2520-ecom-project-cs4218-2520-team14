import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import CartPage from './CartPage';

// Mock external dependencies
jest.mock('./../components/Layout', () => ({
  children,
}) => <div data-testid="Layout">{children}</div>);

const mockUseCart = jest.fn();
const mockSetCart = jest.fn();
jest.mock('../context/cart', () => ({
  useCart: () => mockUseCart(),
}));

const mockUseAuth = jest.fn();
const mockSetAuth = jest.fn();
jest.mock('../context/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock Braintree DropIn
let mockInstance = {
  requestPaymentMethod: jest.fn(() => Promise.resolve({ nonce: 'mock-nonce' })),
};
jest.mock('braintree-web-drop-in-react', () => {
  const DropIn = ({ onInstance, options }) => {
    // Simulate the instance being set after render
    React.useEffect(() => {
      if (onInstance) onInstance(mockInstance);
    }, [onInstance]);
    return (
      <div data-testid="drop-in" data-authorization={options.authorization}>
        DropIn UI
      </div>
    );
  };
  return DropIn;
});

jest.mock('axios');
jest.mock('react-hot-toast');

const localStorageMock = (
  function () {
    let store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => (store[key] = value.toString())),
      removeItem: jest.fn((key) => delete store[key]),
      clear: jest.fn(() => (store = {})),
    };
  })()
);

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

describe('CartPage', () => {
  const MOCK_CART_ITEMS = [
    { _id: '1', name: 'Product 1', description: 'Desc 1', price: 100, photo: 'photo1.jpg' },
    { _id: '2', name: 'Product 2', description: 'Desc 2', price: 200, photo: 'photo2.jpg' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCart.mockReturnValue([[], mockSetCart]);
    mockUseAuth.mockReturnValue([{ user: null, token: null }, mockSetAuth]);
    axios.get.mockResolvedValue({ data: { clientToken: 'mockClientToken' } });
    axios.post.mockResolvedValue({ data: { ok: true } });
    toast.success.mockImplementation(jest.fn());
    toast.error.mockImplementation(jest.fn());
    localStorageMock.clear();
    mockInstance.requestPaymentMethod.mockResolvedValue({ nonce: 'mock-nonce' });

    // Reset environment variable for test mode
    delete process.env.REACT_APP_MODE;
  });

  // Test Case 1: Render as a guest with an empty cart
  test('should display "Hello Guest" and "Your Cart Is Empty" for a guest with an empty cart', () => {
    render(<CartPage />);
    expect(screen.getByText(/Hello Guest/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    expect(screen.queryByTestId('cart-item')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Please Login to checkout/i })).toBeInTheDocument();
    expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
  });

  // Test Case 2: Render as a logged-in user with an empty cart
  test('should display "Hello [User Name]" and "Your Cart Is Empty" for a logged-in user with an empty cart', () => {
    mockUseAuth.mockReturnValueOnce([{ user: { name: 'Test User', address: '123 Main St' }, token: 'abc' }, mockSetAuth]);
    render(<CartPage />);
    expect(screen.getByText(/Hello Test User/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    expect(screen.queryByTestId('cart-item')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Please Login to checkout/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
  });

  // Test Case 3: Render as a guest with items in the cart (should prompt login)
  test('should display cart items and prompt login for a guest with items in cart', () => {
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    render(<CartPage />);
    expect(screen.getByText(/Hello Guest/i)).toBeInTheDocument();
    expect(screen.getByText(`You Have ${MOCK_CART_ITEMS.length} items in your cart please login to checkout !`)).toBeInTheDocument();
    expect(screen.getAllByTestId('cart-item')).toHaveLength(MOCK_CART_ITEMS.length);
    expect(screen.getByRole('button', { name: /Please Login to checkout/i })).toBeInTheDocument();
    expect(screen.queryByText(/Total : \$300\.00/i)).toBeInTheDocument(); // 100+200
    expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
  });

  // Test Case 4: Render as logged-in user with items in cart but no address (should prompt update address)
  test('should display cart items and prompt to update address for a logged-in user without address', () => {
    mockUseAuth.mockReturnValueOnce([{ user: { name: 'Test User', address: '' }, token: 'abc' }, mockSetAuth]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    render(<CartPage />);
    expect(screen.getByText(/Hello Test User/i)).toBeInTheDocument();
    expect(screen.getByText(`You Have ${MOCK_CART_ITEMS.length} items in your cart`)).toBeInTheDocument();
    expect(screen.getAllByTestId('cart-item')).toHaveLength(MOCK_CART_ITEMS.length);
    expect(screen.getByRole('button', { name: /Update Address/i })).toBeInTheDocument();
    expect(screen.queryByText(/Current Address/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
  });

  // Test Case 5: Render as logged-in user with items in cart and address (should show payment options)
  test('should display payment options for a logged-in user with address and cart items', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);

    render(<CartPage />);

    expect(screen.getByText(/Hello Test User/i)).toBeInTheDocument();
    expect(screen.getByText(`You Have ${MOCK_CART_ITEMS.length} items in your cart`)).toBeInTheDocument();
    expect(screen.getAllByTestId('cart-item')).toHaveLength(MOCK_CART_ITEMS.length);
    expect(screen.getByText(/Current Address/i)).toBeInTheDocument();
    expect(screen.getByText(/123 Main St/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Address/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');
      expect(screen.getByTestId('drop-in')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
    });
  });

  // Test Case 6: `totalPrice` calculation correctness
  test('should calculate and display total price correctly', () => {
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    render(<CartPage />);
    expect(screen.getByText(/Total : \$300\.00/i)).toBeInTheDocument();
  });

  test('should display total price as $0.00 for an empty cart', () => {
    render(<CartPage />);
    expect(screen.getByText(/Total : \$0\.00/i)).toBeInTheDocument();
  });

  // Test Case 7: `removeCartItem` functionality
  test('should remove item from cart and update localStorage on button click', async () => {
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    render(<CartPage />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    fireEvent.click(removeButtons[0]); // Click remove for Product 1

    await waitFor(() => {
      expect(mockSetCart).toHaveBeenCalledWith([MOCK_CART_ITEMS[1]]);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('cart', JSON.stringify([MOCK_CART_ITEMS[1]]));
    });
  });

  // Test Case 8: `getToken` effect and axios call
  test('should call getToken and set clientToken on mount when user is authenticated', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);

    render(<CartPage />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');
      // Verify client token is passed to DropIn
      expect(screen.getByTestId('drop-in')).toHaveAttribute('data-authorization', 'mockClientToken');
    });
  });

  test('should not call getToken on mount if user is not authenticated', async () => {
    render(<CartPage />);
    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  // Test Case 9: `handlePayment` success scenario
  test('should handle successful payment flow', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);

    render(<CartPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Processing ..../i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockInstance.requestPaymentMethod).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith('/api/v1/product/braintree/payment', {
        nonce: 'mock-nonce',
        cart: MOCK_CART_ITEMS,
      });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cart');
      expect(mockSetCart).toHaveBeenCalledWith([]);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
      expect(toast.success).toHaveBeenCalledWith('Payment Completed Successfully ');
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeEnabled(); // Back to enabled state
    });
  });

  // Test Case 10: `handlePayment` error scenario
  test('should handle payment error gracefully', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    axios.post.mockRejectedValueOnce(new Error('Payment failed'));
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log

    render(<CartPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Processing ..../i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(new Error('Payment failed'));
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeEnabled();
      expect(toast.success).not.toHaveBeenCalled(); // No success toast on error
    });
    consoleSpy.mockRestore();
  });

  // Test Case 11: `handlePayment` with `REACT_APP_MODE === "test"`
  test('should skip requestPaymentMethod when REACT_APP_MODE is "test"', async () => {
    process.env.REACT_APP_MODE = 'test';
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);

    render(<CartPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

    await waitFor(() => {
      expect(mockInstance.requestPaymentMethod).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith('/api/v1/product/braintree/payment', {
        nonce: undefined, // nonce will be undefined as requestPaymentMethod is skipped
        cart: MOCK_CART_ITEMS,
      });
      expect(toast.success).toHaveBeenCalledWith('Payment Completed Successfully ');
    });
  });

  // Test Case 12: Button navigations
  test('should navigate to profile on Update Address button click', () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    render(<CartPage />);
    fireEvent.click(screen.getByRole('button', { name: /Update Address/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/profile');
  });

  test('should navigate to login on Please Login to checkout button click', () => {
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    render(<CartPage />);
    fireEvent.click(screen.getByRole('button', { name: /Please Login to checkout/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: '/cart' });
  });

  // Test Case 13: Make Payment button disabled states
  test('Make Payment button should be disabled when loading', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);

    // Simulate a pending axios call that keeps loading true
    axios.post.mockReturnValueOnce(new Promise(() => {}));

    render(<CartPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Processing ..../i })).toBeDisabled();
    });
  });

  test('Make Payment button should be disabled if no instance is available', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    mockInstance = null; // Simulate no instance

    render(<CartPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeDisabled();
    });
  });

  test('Make Payment button should be disabled if user has no address', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);

    render(<CartPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Make Payment/i })).toBeDisabled();
    });
  });

  test('Make Payment button should be disabled if clientToken is not available', async () => {
    mockUseAuth.mockReturnValueOnce([
      { user: { name: 'Test User', address: '123 Main St' }, token: 'abc' },
      mockSetAuth,
    ]);
    mockUseCart.mockReturnValueOnce([MOCK_CART_ITEMS, mockSetCart]);
    axios.get.mockResolvedValue({ data: { clientToken: null } }); // Simulate no client token

    render(<CartPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('drop-in')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Make Payment/i })).not.toBeInTheDocument(); // Button not even rendered
    });
  });
});
