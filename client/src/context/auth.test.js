//Name: Shauryan Agrawal
//Student ID: A0265846N


import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock axios so we can inspect defaults header assignment
jest.mock("axios", () => ({
  defaults: {
    headers: {
      common: {},
    },
  },
}));

import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

// Tiny probe component to read context (covers useAuth line too)
function Probe() {
  const [auth] = useAuth();
  return (
    <div>
      <div data-testid="token">{auth.token}</div>
      <div data-testid="user">{auth.user ? auth.user.name : ""}</div>
    </div>
  );
}

describe("context/auth.js (minimal 100% coverage)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    axios.defaults.headers.common = {}; // reset between tests
  });

  it("default branch: when localStorage has no auth, stays at default + sets axios header to empty", () => {
    jest.spyOn(Storage.prototype, "getItem").mockReturnValue(null);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId("token")).toHaveTextContent("");
    expect(screen.getByTestId("user")).toHaveTextContent("");

    // header assigned on render
    expect(axios.defaults.headers.common.Authorization).toBe("");
  });

  it("hydrates from localStorage on mount + updates axios header to token", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockReturnValue(
      JSON.stringify({ user: { name: "John" }, token: "abc123" })
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    // after useEffect runs + setAuth triggers rerender
    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("abc123")
    );
    expect(screen.getByTestId("user")).toHaveTextContent("John");

    // header should now reflect hydrated token
    expect(axios.defaults.headers.common.Authorization).toBe("abc123");
  });
});
