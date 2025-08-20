import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Try to get token from Authorization header first, then fallback to cookies
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const cookieToken = req.cookies.accessToken;
  
  const token = bearerToken || cookieToken;

  console.log("Auth header:", authHeader);
  console.log("Cookie token:", cookieToken ? "exists" : "not found");
  console.log("Using token from:", bearerToken ? "header" : cookieToken ? "cookie" : "none");

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (error: any) {
    console.error("Token verification failed:", error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ code: 401, data: {}, message: "Unauthorized user" });
  }
};

export default authenticateToken;