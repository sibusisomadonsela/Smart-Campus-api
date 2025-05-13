const express = require('express');
const { check, param } = require('express-validator');
const maintenanceController = require('../controller/maintenanceController');

const router = express.Router();

// Validation middleware
const maintenanceValidation = [
  check('boardroom')
    .isMongoId()
    .withMessage('Invalid boardroom ID'),
  check('type')
    .isIn(['repair', 'cleaning', 'equipment', 'furniture', 'electrical', 'plumbing', 'other'])
    .withMessage('Invalid maintenance type'),
  check('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  check('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  check('estimatedCompletion')
    .optional()
    .isISO8601()
    .withMessage('Invalid estimated completion date')
];

const assignmentValidation = [
  check('assignedTo')
    .isMongoId()
    .withMessage('Invalid staff ID'),
  check('estimatedCompletion')
    .isISO8601()
    .withMessage('Invalid estimated completion date')
];

const statusValidation = [
  check('status')
    .isIn(['pending', 'assigned', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  check('resolution')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Resolution must be between 10 and 1000 characters')
];

const costValidation = [
  check('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  check('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  check('parts.*.name')
    .trim()
    .notEmpty()
    .withMessage('Part name is required'),
  check('parts.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  check('parts.*.cost')
    .isFloat({ min: 0 })
    .withMessage('Part cost must be a positive number')
];

const noteValidation = [
  check('content')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Note content must be between 5 and 500 characters')
];

// Maintenance routes
router.post('/', maintenanceValidation, maintenanceController.createMaintenance);
router.get('/', maintenanceController.getMaintenanceRequests);
router.get('/overdue', maintenanceController.getOverdueMaintenance);
router.get('/stats', maintenanceController.getMaintenanceStats);
router.get('/:id', param('id').isMongoId(), maintenanceController.getMaintenanceById);
router.put('/:id', [
  param('id').isMongoId(),
  ...maintenanceValidation
], maintenanceController.updateMaintenance);
router.delete('/:id', param('id').isMongoId(), maintenanceController.deleteMaintenance);

// Assignment routes
router.post('/:id/assign', [
  param('id').isMongoId(),
  ...assignmentValidation
], maintenanceController.assignMaintenance);

// Status update route
router.put('/:id/status', [
  param('id').isMongoId(),
  ...statusValidation
], maintenanceController.updateStatus);

// Note routes
router.post('/:id/notes', [
  param('id').isMongoId(),
  ...noteValidation
], maintenanceController.addNote);

// Cost update route
router.put('/:id/cost', [
  param('id').isMongoId(),
  ...costValidation
], maintenanceController.updateCost);

module.exports = router; 