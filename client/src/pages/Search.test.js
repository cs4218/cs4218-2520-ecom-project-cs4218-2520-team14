//Teng Hui Xin Alicia, A0259064Y
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";
import Search from "./Search";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockUseSearch = jest.fn();
jest.mock("../context/search", () => ({
  useSearch: () => mockUseSearch(),
}));

const mockSetCart = jest.fn();
const mockUseCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: () => mockUseCart(),
}));

describe("Search page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockUseSearch.mockReturnValue([{ results: [] }]);
    mockUseCart.mockReturnValue([[], mockSetCart]);
  });

  it("renders page shell and heading", () => {
    render(<Search />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /search results/i }),
    ).toBeInTheDocument();
  });

  it("handles missing search values by showing empty state", () => {
    mockUseSearch.mockReturnValue([undefined]);

    render(<Search />);

    expect(screen.getByText(/no products found/i)).toBeInTheDocument();
  });

  it("renders products and count when results exist", () => {
    const products = [
      {
        _id: "p1",
        slug: "yellow-dress",
        name: "Yellow Dress",
        description:
          "A yellow dress that captures the attention of many people.",
        price: 25,
      },
      {
        _id: "p2",
        slug: "blue-jeans",
        name: "Blue Jeans",
        description: "New jeans that last forever.",
        price: 60,
      },
    ];

    mockUseSearch.mockReturnValue([{ results: products }]);

    render(<Search />);

    expect(screen.getByText("Found 2 products")).toBeInTheDocument();
    expect(screen.getByText("Yellow Dress")).toBeInTheDocument();
    expect(screen.getByText("Blue Jeans")).toBeInTheDocument();
    expect(screen.getByAltText("Yellow Dress")).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p1",
    );
    expect(screen.getByAltText("Blue Jeans")).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p2",
    );

    expect(
      screen.getByText(
        products[0].price.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        }),
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        products[1].price.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        }),
      ),
    ).toBeInTheDocument();
  });

  it("clicking 'More Details' navigates to product page", () => {
    const products = [
      {
        _id: "p1",
        slug: "yellow-dress",
        name: "Yellow Dress",
        description:
          "A yellow dress that captures the attention of many people.",
        price: 25,
      },
    ];
    mockUseSearch.mockReturnValue([{ results: products }]);

    render(<Search />);

    fireEvent.click(screen.getByRole("button", { name: /more details/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/product/yellow-dress");
  });

  it("clicking 'ADD TO CART' updates cart, writes localStorage, and shows toast", () => {
    const product = {
      _id: "p1",
      slug: "yellow-dress",
      name: "Yellow Dress",
      description: "A yellow dress that captures the attention of many people.",
      price: 25,
    };

    const existingCart = [{ _id: "old", name: "Old Item" }];
    mockUseCart.mockReturnValue([existingCart, mockSetCart]);
    mockUseSearch.mockReturnValue([{ results: [product] }]);

    const setItemSpy = jest.spyOn(window.localStorage.__proto__, "setItem");

    render(<Search />);

    fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));

    expect(mockSetCart).toHaveBeenCalledWith([...existingCart, product]);

    expect(setItemSpy).toHaveBeenCalledWith(
      "cart",
      JSON.stringify([...existingCart, product]),
    );

    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");

    setItemSpy.mockRestore();
  });

  it("shows ellipsis when description is longer than 60 chars", () => {
    const longDesc = "a".repeat(61);
    mockUseSearch.mockReturnValue([
      {
        results: [
          {
            _id: "p1",
            slug: "long-desc",
            name: "Long Desc Product",
            description: longDesc,
            price: 10,
          },
        ],
      },
    ]);

    render(<Search />);

    expect(screen.getByText(/\.{3}$/)).toBeInTheDocument();
  });

});
