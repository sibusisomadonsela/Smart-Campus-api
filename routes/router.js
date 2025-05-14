const express = require('express');
const router = express.Router();
const { check, param } = require('express-validator');
const userController = require('../controller/userController');
const campusController = require('../controller/campusController');
const courseController = require('../controller/courseController');
const courseRoutes = require('./courseRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');

// Validation middleware
const userValidation = [ 
  check('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  check('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  check('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  check('role')
    .isIn(['student', 'teacher', 'admin', 'staff'])
    .withMessage('Invalid role'),
  check('campus')
    .isMongoId()
    .withMessage('Invalid campus ID')
];

const campusValidation = [
  check('name')
    .trim()
    .notEmpty()
    .withMessage('Campus name is required'),
  check('code')
    .trim()
    .notEmpty()
    .withMessage('Campus code is required')
    .isUppercase()
    .withMessage('Campus code must be uppercase'),
  check('province')
    .trim()
    .notEmpty()
    .withMessage('Province is required')
];

const passwordUpdateValidation = [
  check('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  check('password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

const loginValidation = [
  check('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  check('password')
    .notEmpty()
    .withMessage('Password is required')
];

// User routes
router.post('/users/login', loginValidation, userController.login);
router.put('/users/password', passwordUpdateValidation, userController.updatePassword);
router.post('/users', userValidation, userController.createUser);
router.get('/users', userController.getUsers);
router.get('/users/search', userController.searchUsers);
router.get('/users/:id', userController.getUserById);
router.put('/users/:id', userValidation, userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.put('/users/:id/toggle-status', userController.toggleUserStatus);
router.get('/users/campus/:campusId', userController.getUsersByCampus);

// Campus routes
router.post('/campuses', campusValidation, campusController.createCampus);
router.get('/campuses', campusController.getCampuses);
router.get('/campuses/search', campusController.searchCampuses);
router.get('/campuses/:id', campusController.getCampusById);
router.get('/campuses/:id/stats', campusController.getCampusStats);
router.put('/campuses/:id', campusValidation, campusController.updateCampus);
router.delete('/campuses/:id', campusController.deleteCampus);
router.put('/campuses/:id/toggle-status', campusController.toggleCampusStatus);

// Course routes
router.use('/courses', courseRoutes);

// Maintenance routes
router.use('/maintenance', maintenanceRoutes);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

module.exports = router;
