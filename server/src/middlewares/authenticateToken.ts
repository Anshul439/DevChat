import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const authenticateToken = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' }); // No token, send 401
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    // return next(
    //   errorHandler(401, res, "You are not authorized to update this user")
    // );
    return res.status(401).json({ code: 401, data: {}, message: "Unauthorized user" });
  }
};

export default authenticateToken;
