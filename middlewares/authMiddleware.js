import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        success: false,
        message: "Authorization header missing",
      });
    }

    // Support both: "Bearer <token>" and "<token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    if (!token) {
      return res.status(401).send({
        success: false,
        message: "Token missing",
      });
    }

    const decode = JWT.verify(token, process.env.JWT_SECRET);
    req.user = decode;
    return next();
  } catch (error) {
    console.log(error);
    return res.status(401).send({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// admin access
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).send({
        success: false,
        message: "UnAuthorized Access",
      });
    }

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(401).send({
        success: false,
        message: "UnAuthorized Access",
      });
    }

    if (user.role !== 1) {
      return res.status(401).send({
        success: false,
        message: "UnAuthorized Access",
      });
    }

    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in admin middleware",
      error,
    });
  }
};
