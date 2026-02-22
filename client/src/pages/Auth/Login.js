//Name: Shauryan Agrawal
//Student ID: A0265846N

import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";
import { useAuth } from "../../context/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [auth, setAuth] = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();


  const getRedirectPath = () => {
    const state = location?.state;

    if (!state) return "/";


    if (typeof state === "string") return state;

    const from = state?.from;

    if (typeof from === "string") return from;
    if (typeof from?.pathname === "string") return from.pathname;

    return "/";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // prevent double submit
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/v1/auth/login", { email, password });

      if (res?.data?.success) {
        const message = res?.data?.message || "Login successful";

        toast.success(message, {
          duration: 5000,
          icon: "🙏",
          style: {
            background: "green",
            color: "white",
          },
        });

        const nextAuth = {
          ...auth,
          user: res.data.user,
          token: res.data.token,
        };

        setAuth(nextAuth);

        //store only what you need (stable + smaller)
        localStorage.setItem(
          "auth",
          JSON.stringify({ user: res.data.user, token: res.data.token })
        );

        navigate(getRedirectPath());
      } else {
        toast.error(res?.data?.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Login - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">LOGIN FORM</h4>

          <div className="mb-3">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              id="exampleInputPassword1"
              placeholder="Enter Your Password"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-3">
            <button
              type="button"
              className="btn forgot-btn"
              onClick={() => navigate("/forgot-password")}
              disabled={isSubmitting}
            >
              Forgot Password
            </button>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Login;