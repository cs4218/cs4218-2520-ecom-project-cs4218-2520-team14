// Chia York Lim, A0258147X
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import useCategory from './useCategory';
import axios from 'axios';

jest.mock('axios');

describe('useCategory Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return categories', async () => {
    const mockCategories = [
      { _id: '1', name: 'Category 1' },
      { _id: '2', name: 'Category 2' },
    ];
    axios.get.mockResolvedValueOnce({ data: { category: mockCategories } });
    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual(mockCategories);
    });

    expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
  });

  it("should return an empty array when there are no categories", async () => {
    axios.get.mockResolvedValueOnce({ data: { category: [] } });
    const { result } = renderHook(() => useCategory());
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('should handle log error', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    const mockError = new Error('Network Error');
    axios.get.mockRejectedValueOnce(mockError);
    renderHook(() => useCategory());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });
    consoleSpy.mockRestore();
  });
});
