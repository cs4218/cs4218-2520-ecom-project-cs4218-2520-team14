import React from "react";
import { useState, useContext, createContext, useEffect } from "react";

const CartContext = createContext();
const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    try {
      let existingCartItem = localStorage.getItem("cart");
      if (existingCartItem) {
        const parsedCart = JSON.parse(existingCartItem);
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart.filter(item => item && typeof item === 'object'));
        } else {
          throw new Error("Cart data invalid");
        }
      }
    } catch (error) {
      console.error("Error parsing cart from localStorage:", error);
      localStorage.removeItem("cart");
      setCart([]);
    }
  }, []);

  return (
    <CartContext.Provider value={[cart, setCart]}>
      {children}
    </CartContext.Provider>
  );
};

// custom hook
const useCart = () => useContext(CartContext);

export { useCart, CartProvider };