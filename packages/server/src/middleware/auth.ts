// packages/server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super-secret-key-change-later';

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN" format se token nikalna

  if (!token) return res.status(401).json({ message: 'Access Denied. No Token Provided.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid Token' });
    req.user = user; // Request me user ki detail daal di
    next(); // Guard ne andar jane diya
  });
};