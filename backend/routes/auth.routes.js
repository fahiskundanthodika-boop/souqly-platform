// Auth routes - signup, login, profile
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { register, login, getMe, updateProfile, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Validation rules for signup
const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Shop name is required')
    .isLength({ min: 2 }).withMessage('Shop name must be at least 2 characters'),
  body('ownerName')
    .trim()
    .notEmpty().withMessage('Owner name is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  body('city')
    .trim()
    .notEmpty().withMessage('City is required'),
];

// Validation rules for login
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address'),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

// Middleware to check validation results and return errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return the first error message in a clean format
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }
  next();
};

router.post('/register', signupValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.post('/logout', protect, logout);

module.exports = router;
