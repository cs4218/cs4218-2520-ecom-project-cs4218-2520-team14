import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useAuth } from '../context/auth';
import { useCart } from '../context/cart';
import { useNavigate } from 'react-router-dom';
import CartPage from './CartPage';

jest.mock('axios');
jest.mock('../context/auth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../context/cart', () => ({
  useCart: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));
jest.mock('braintree-web-drop-in-react', () => () => <div data-testid="dropin-mock" />);

describe('CartPage', () => {
  const mockNavigate = jest.fn();
  const mockSetCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    axios.get.mockResolvedValue({ data: { clientToken: 'mock-token' } });
  });

  test('should render empty cart message', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
    useCart.mockReturnValue([[], mockSetCart]);

    render(<CartPage />);
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
  });

  test('should render cart items and allow removal', () => {
    const mockCart = [
      { _id: '1', name: 'Product 1', price: 10, description: 'Desc 1' }
    ];
    useAuth.mockReturnValue([{ user: { name: 'John' }, token: 'abc' }, jest.fn()]);
    useCart.mockReturnValue([mockCart, mockSetCart]);
    Storage.prototype.setItem = jest.fn();

    render(<CartPage />);
    
    const removeBtn = screen.getByText(/Remove/i);
    fireEvent.click(removeBtn);

    expect(mockSetCart).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  test('should redirect to login when clicking checkout without auth', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
    useCart.mockReturnValue([{ _id: '1', price: 10 }, mockSetCart]);

    render(<CartPage />);
    const loginBtn = screen.getByText(/Please Login to checkout/i);
    fireEvent.click(loginBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: '/cart' });
  });

  test('should show update address button when authenticated without address', () => {
    useAuth.mockReturnValue([{ user: { name: 'John' }, token: 'abc' }, jest.fn()]);
    useCart.mockReturnValue([{ _id: '1', price: 10 }, mockSetCart]);

    render(<CartPage />);
    expect(screen.getByText(/Update Address/i)).toBeInTheDocument();
  });

  test('should trigger payment flow correctly', async () => {
    process.env.REACT_APP_MODE = 'test';
    useAuth.mockReturnValue([{ user: { name: 'John', address: '123 St' }, token: 'abc' }, jest.fn()]);
    useCart.mockReturnValue([{ _id: '1', price: 10 }, mockSetCart]);
    axios.post.mockResolvedValue({ data: {} });

    render(<CartPage />);
    
    const payBtn = screen.getByText(/Make Payment/i);
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(mockSetCart).toHaveBeenCalledWith([]);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
    });
  });
});