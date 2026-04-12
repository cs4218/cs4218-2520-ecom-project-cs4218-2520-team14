import React from "react";
import { render, screen } from "@testing-library/react";
import Categories from "./Categories";

// Mock the react-router-dom Link component
// This allows us to test that the Link component receives the correct props
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, className }) => (
    <a href={to} className={className} data-testid="mock-link-to">{children}</a>
  ),
}));

// Mock the useCategory custom hook
// This isolates the Categories component from actual data fetching
const mockUseCategory = jest.fn();
jest.mock("../hooks/useCategory", () => () => mockUseCategory());

// Mock the Layout component
// This isolates the Categories component from the layout's internal logic
jest.mock("../components/Layout", () => {
  const MockLayout = ({ title, children }) => (
    <div data-testid="layout-mock" data-layout-title={title}>
      {children}
    </div>
  );
  MockLayout.displayName = "MockLayout"; // For better debug output
  return MockLayout;
});

describe("Categories Component", () => {
  beforeEach(() => {
    // Clear all mocks before each test to ensure isolation
    jest.clearAllMocks();
  });

  it("should render the layout with the correct title", () => {
    // Arrange
    mockUseCategory.mockReturnValue([]); // No categories for this test

    // Act
    render(<Categories />);

    // Assert
    const layoutElement = screen.getByTestId("layout-mock");
    expect(layoutElement).toBeInTheDocument();
    expect(layoutElement).toHaveAttribute("data-layout-title", "All Categories");
  });

  it("should display all categories fetched by useCategory hook", () => {
    // Arrange
    const categories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
      { _id: "2", name: "Books", slug: "books" },
      { _id: "3", name: "Clothing", slug: "clothing" },
    ];
    mockUseCategory.mockReturnValue(categories);

    // Act
    render(<Categories />);

    // Assert
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();

    // Verify the number of category items rendered
    const categoryItems = screen.getAllByTestId("category-item");
    expect(categoryItems).toHaveLength(categories.length);
  });

  it("should render correct links for each category", () => {
    // Arrange
    const categories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
      { _id: "2", name: "Books", slug: "books" },
    ];
    mockUseCategory.mockReturnValue(categories);

    // Act
    render(<Categories />);

    // Assert
    // Check the 'to' prop of the mocked Link component
    expect(screen.getByText("Electronics")).toHaveAttribute("href", "/category/electronics");
    expect(screen.getByText("Books")).toHaveAttribute("href", "/category/books");

    // Verify the presence of the button class
    expect(screen.getByText("Electronics")).toHaveClass("btn btn-primary");
    expect(screen.getByText("Books")).toHaveClass("btn btn-primary");
  });

  it("should display a message or nothing if no categories are returned", () => {
    // Arrange
    mockUseCategory.mockReturnValue([]); // No categories

    // Act
    render(<Categories />);

    // Assert
    // Ensure no category items are rendered
    expect(screen.queryByTestId("category-item")).not.toBeInTheDocument();

    // Assert that the layout is still rendered with the correct title
    const layoutElement = screen.getByTestId("layout-mock");
    expect(layoutElement).toBeInTheDocument();
    expect(layoutElement).toHaveAttribute("data-layout-title", "All Categories");
  });

  it("should handle empty category names or slugs gracefully", () => {
    // Arrange
    const categories = [
      { _id: "1", name: "", slug: "empty-name" },
      { _id: "2", name: "Test", slug: "" },
    ];
    mockUseCategory.mockReturnValue(categories);

    // Act
    render(<Categories />);

    // Assert
    const categoryItems = screen.getAllByTestId("category-item");
    expect(categoryItems).toHaveLength(2);

    // For empty name, the link text will be empty
    const emptyNameLink = screen.getByTestId("category-item").querySelector("a");
    expect(emptyNameLink).toBeInTheDocument();
    expect(emptyNameLink).toHaveTextContent(""); // Text content is empty
    expect(emptyNameLink).toHaveAttribute("href", "/category/empty-name");

    // For empty slug, the link 'to' prop will have a trailing slash
    // Find the link with 'Test' content
    const testLink = screen.getByText("Test");
    expect(testLink).toBeInTheDocument();
    expect(testLink).toHaveAttribute("href", "/category/");
  });
});
