const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  let token = null;
  const authHeader = req.headers['authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Token tidak ditemukan',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id || !decoded.role) {
      return res.status(403).json({ 
        success: false,
        message: 'Token tidak valid: payload tidak lengkap',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token telah kadaluarsa',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({ 
      success: false,
      message: 'Token tidak valid',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = authenticate;