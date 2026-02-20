import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }

  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    // Keep log if you want, but don't swallow:
    console.log(error);
    throw error;
  }
};

export const comparePassword = async (password, hashedPassword) => {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }
  if (typeof hashedPassword !== "string" || hashedPassword.length === 0) {
    throw new Error("Hashed password must be a non-empty string");
  }

  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.log(error);
    throw error;
  }
};
