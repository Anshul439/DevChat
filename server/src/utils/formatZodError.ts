import { ZodError } from "zod";

export const formatZodError = (error: ZodError) => {
    return error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));
  };