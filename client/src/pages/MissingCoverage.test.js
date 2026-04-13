// Chia York Lim, A0258147X
import React from 'react';
import Categories from './Categories';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { mockCategories } from '../tests/fixtures/test.categories.data';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import useCategory from '../hooks/useCategory';

jest.mock('axios');

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

jest.mock('../hooks/useCategory', () => ({
  __esModule: true,
  default: jest.fn(() => [])
}));

describe('Categories Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCategory.mockReturnValue(mockCategories.data.category);
  });
  it('should render category when there is one category', async () => {
    // Arrange
    useCategory.mockReturnValue(mockCategories.data.category.slice(0, 1));

    // Act
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(getByTestId('category-item')).toBeInTheDocument());

    // Assert
    expect(getByTestId('category-item')).toHaveTextContent(mockCategories.data.category[0].name);
    expect(getByTestId('category-item').querySelector('a')).toHaveAttribute('href', `/category/${mockCategories.data.category[0].slug}`);
  });
});