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

  it('renders categories', async () => {
    // Act
    const { getAllByTestId } = render(
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </MemoryRouter>
    );
    // Assert
    await waitFor(() => expect(getAllByTestId('category-item')).toHaveLength(3));
  });

  // Currently, they have the same behavior, so we can combine them into one test case. If we want to separate them, we can create a new test case for the error scenario and mock axios.get to reject the promise.
  it('should render nothing when there are no categories (No category / error in useCategory)', async () => {
    // Arrange
    useCategory.mockReturnValue([]);

    // Act
    const { queryByTestId } = render(
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert
    await waitFor(() => expect(queryByTestId('category-item')).toBeNull());
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

  it('renders categories with correct names and links', async () => {
    // Arrange
    useCategory.mockReturnValue(mockCategories.data.category);

    // Act
    const { getAllByTestId } = render(
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </MemoryRouter>
    )

    // Assert
    await waitFor(() => {
      const items = getAllByTestId('category-item');
      items.forEach((item, index) => {
        expect(item).toHaveTextContent(mockCategories.data.category[index].name);
        expect(item.querySelector('a')).toHaveAttribute(
          'href',
          `/category/${mockCategories.data.category[index].slug}`
        );
      });
    });
  });

  it('should be able to navigate to category page on click', async () => {
    // Arrange
    const { container } = render(
      <MemoryRouter initialEntries={['/categories']}>
        <Routes>
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<div>Category Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const row = container.querySelector('.row');
    await waitFor(() => expect(within(row).getByText(mockCategories.data.category[0].name)).toBeInTheDocument());
    const categoryLink = within(row).getByText(mockCategories.data.category[0].name);
    expect(categoryLink.getAttribute('href')).toBe(`/category/${mockCategories.data.category[0].slug}`);

    // Act
    fireEvent.click(categoryLink);

    // Assert
    await waitFor(() => expect(container).toHaveTextContent('Category Page'));
  });
});