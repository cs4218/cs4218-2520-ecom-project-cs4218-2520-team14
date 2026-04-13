// Chia York Lim, A0258147X
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import HomePage from './HomePage';
import { categories, products, totalProducts } from '../tests/fixtures/test.homepage.data';
import { Prices } from '../components/Prices';

jest.mock('axios');
jest.mock('react-hot-toast');

const mockNavigate = jest.fn();
const mockCart = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], mockCart]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
}));

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: function () { },
    removeListener: function () { }
  };
};

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load more products on clicking load more button', async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url.includes('get-category')) {
        return Promise.resolve({ data: { success: true, category: categories } });
      }
      if (url.includes('product-count')) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes('product-list')) {
        return Promise.resolve({ data: { products: products } });
      }
      return Promise.resolve({ data: {} });
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText("Loadmore")).toBeInTheDocument();
    });

    // Act
    fireEvent.click(getByText("Loadmore"));

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/2');
    });
  });

  it('load more products fails on clicking load more button', async () => {
    // Arrange
    const networkError = new Error('Network Error');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    axios.get.mockImplementation((url) => {
      if (url.includes('get-category')) {
        return Promise.resolve({ data: { success: true, category: categories } });
      }
      if (url.includes('product-count')) {
        return Promise.resolve({ data: { total: 10 } });
      }
      if (url.includes('product-list/2')) {
        return Promise.reject(networkError);
      }
      if (url.includes('product-list')) {
        return Promise.resolve({ data: { products: products } });
      }
      return Promise.resolve({ data: {} });
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText("Loadmore")).toBeInTheDocument();
    });

    // Act
    fireEvent.click(getByText("Loadmore"));

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/2');
    });

    expect(consoleSpy).toHaveBeenCalledWith(networkError);
    consoleSpy.mockRestore();
  });

  it('should be able to set price filter', async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url.includes('get-category')) {
        return Promise.resolve({ data: { success: true, category: categories } });
      }
      if (url.includes('product-count')) {
        return Promise.resolve({ data: { total: totalProducts } });
      }
      if (url.includes('product-list')) {
        return Promise.resolve({ data: { products: products } });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockResolvedValue({ data: { products: [products[0]] } });

    const { findByLabelText, queryByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );


    axios.get.mockClear(); // Clear previous calls

    // Act
    const priceRadio = await findByLabelText(Prices[5].name);
    fireEvent.click(priceRadio);

    // Assert
    expect(priceRadio.checked).toBe(true);
    expect(axios.post).toHaveBeenCalledWith('/api/v1/product/product-filters', { checked: [], radio: Prices[5].array });
    expect(axios.get).not.toHaveBeenCalledWith('/api/v1/product/product-list/1');

    await waitFor(() => {
      expect(queryByText(products[1].name)).not.toBeInTheDocument();
    });
  });

  it('should reload page when reset filters is clicked', async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url.includes('product-list')) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve([]);
    });
    delete window.location;
    window.location = { reload: jest.fn() };
    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => { });

    // Act
    fireEvent.click(getByText('RESET FILTERS'));

    // Assert
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('should be able to navigate to single product page', async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url.includes('product-list')) {
        return Promise.resolve({ data: { products: [products[0]] } });
      }
      return Promise.resolve([]);
    });

    const { getByText, getAllByTestId } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAllByTestId('product-item')).toHaveLength(1);
    });

    // Act
    fireEvent.click(getByText("More Details"));

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(`/product/${products[0].slug}`);
  });

  it('should be able to add to cart', async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url.includes('product-list')) {
        return Promise.resolve({ data: { products: [products[0]] } });
      }
      return Promise.resolve([]);
    });

    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText(products[0].name)).toBeInTheDocument();
    });

    // Act
    fireEvent.click(getByText("ADD TO CART"));

    // Assert
    expect(mockCart).toHaveBeenCalledWith([products[0]]);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('cart', JSON.stringify([products[0]]));
    expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
  });
});