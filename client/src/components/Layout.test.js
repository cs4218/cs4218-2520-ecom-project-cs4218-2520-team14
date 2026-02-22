import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import Layout from "./Layout";

// Mock Header and Footer to isolate Layout
jest.mock("./Header", () => () => <div data-testid="header" />);
jest.mock("./Footer", () => () => <div data-testid="footer" />);

// Mock Toaster
jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

afterEach(() => {
  cleanup();
  // reset head between tests
  document.head.innerHTML = "";
  document.title = "";
});

describe("Layout", () => {
  test("renders Header, Footer, Toaster and children correctly", () => {
    render(
      <Layout title="Test Title">
        <div data-testid="child">Page Content</div>
      </Layout>
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("Page Content");
  });

  test("sets Helmet title and meta tags from props", async () => {
    render(
      <Layout
        title="Custom Title"
        description="Custom Desc"
        keywords="a,b,c"
        author="John Pork"
      >
        Content
      </Layout>
    );

    await waitFor(() => {
      expect(document.title).toBe("Custom Title");
    });

    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Custom Desc"
    );

    expect(document.querySelector('meta[name="keywords"]')).toHaveAttribute(
      "content",
      "a,b,c"
    );

    expect(document.querySelector('meta[name="author"]')).toHaveAttribute(
      "content",
      "John Pork"
    );
  });

  test("uses defaultProps when no props are provided", async () => {
    render(<Layout>Default Content</Layout>);

    await waitFor(() => {
      expect(document.title).toBe("Ecommerce app - shop now");
    });

    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "mern stack project"
    );

    expect(document.querySelector('meta[name="keywords"]')).toHaveAttribute(
      "content",
      "mern,react,node,mongodb"
    );

    expect(document.querySelector('meta[name="author"]')).toHaveAttribute(
      "content",
      "Techinfoyt"
    );
  });
});