// Teng Hui Xin Alicia, A0259064Y
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Profile from "./Profile";
import { act } from "react-dom/test-utils";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="usermenu" />
));
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));
jest.mock("../../components/Header", () => () => <div>Header</div>);

const mockSetAuth = jest.fn();

const mockAuth = {
  user: {
    name: "Mina Sue",
    email: "mina.sue@netflix.com",
    phone: "123456789",
    address: "Singles Inferno",
  },
};

jest.mock("../../context/auth", () => ({
  useAuth: () => [mockAuth, mockSetAuth],
}));

describe("Profile", () => {
  const renderProfile = () =>
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("auth", JSON.stringify(mockAuth));
  });

  it("renders form and prefills fields from auth.user", async () => {
    renderProfile();

    expect(screen.getByText("USER PROFILE")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(
      "Mina Sue",
    );
    expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue(
      "mina.sue@netflix.com",
    );
    expect(screen.getByPlaceholderText("Enter Your Phone")).toHaveValue(
      "123456789",
    );
    expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue(
      "Singles Inferno",
    );
    expect(screen.getByPlaceholderText("Enter Your Email")).toBeDisabled();
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("calls update with correct details with success toast", async () => {
    const updatedUser = {
      name: "Tira Misu",
      phone: "987654321",
      address: "Paradise",
      password: "newPassword",
    };

    axios.put.mockResolvedValueOnce({
      data: { updatedUser: { ...updatedUser, email: "mina.sue@netflix.com" } },
    });

    renderProfile();
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: updatedUser.name },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: updatedUser.phone },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: updatedUser.address },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: updatedUser.password },
      });
    });

    fireEvent.click(screen.getByText("UPDATE"));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/profile",
        expect.objectContaining({
          name: "Tira Misu",
          email: "mina.sue@netflix.com",
          password: "newPassword",
          phone: "987654321",
          address: "Paradise",
        }),
      );

      expect(toast.success).toHaveBeenCalledWith(
        "Profile Updated Successfully",
      );
    });
    const ls = JSON.parse(localStorage.getItem("auth"));
    expect(ls.user.name).toBe("Tira Misu");
    expect(ls.user.email).toBe("mina.sue@netflix.com");
    expect(ls.user.phone).toBe("987654321");
    expect(ls.user.address).toBe("Paradise");
  });

  it("shows error toast with invalid password", async () => {
    axios.put.mockResolvedValueOnce({
      data: { error: "Password is required and must be 6 character long" },
    });

    renderProfile();

    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update/i }));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/profile",
        expect.objectContaining({
          name: "Mina Sue",
          email: "mina.sue@netflix.com",
          password: "123",
          phone: "123456789",
          address: "Singles Inferno",
        }),
      );

      expect(toast.error).toHaveBeenCalledWith(
        "Password is required and must be 6 character long",
      );
    });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows generic error toast when request fails", async () => {
    axios.put.mockRejectedValueOnce(new Error("Network error"));

    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /update/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    expect(toast.success).not.toHaveBeenCalled();
  });
});
