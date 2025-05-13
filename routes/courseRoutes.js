const express = require('express');
const { check, param } = require('express-validator');
const courseController = require('../controller/courseController');

const router = express.Router();

// Validation middleware
const courseValidation = [
  check('code')
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('Course code must be between 3 and 10 characters'),
  check('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Course name must be between 3 and 100 characters'),
  check('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  check('credits')
    .isInt({ min: 1, max: 6 })
    .withMessage('Credits must be between 1 and 6'),
  check('level')
    .isIn(['undergraduate', 'graduate', 'postgraduate'])
    .withMessage('Invalid course level'),
  check('department')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters')
];

const offeringValidation = [
  check('campus')
    .isMongoId()
    .withMessage('Invalid campus ID'),
  check('semester')
    .isIn(['fall', 'spring', 'summer'])
    .withMessage('Invalid semester'),
  check('year')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Invalid year'),
  check('startDate')
    .isISO8601()
    .withMessage('Invalid start date'),
  check('endDate')
    .isISO8601()
    .withMessage('Invalid end date'),
  check('schedule.*.day')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day'),
  check('schedule.*.startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  check('schedule.*.endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)'),
  check('schedule.*.location')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Location must be between 2 and 50 characters'),
  check('instructor')
    .isMongoId()
    .withMessage('Invalid instructor ID'),
  check('capacity')
    .isInt({ min: 1 })
    .withMessage('Capacity must be at least 1')
];

// Course routes
router.post('/', courseValidation, courseController.createCourse);
router.get('/', courseController.getCourses);
router.get('/search', courseController.searchCourses);
router.get('/:id', param('id').isMongoId(), courseController.getCourseById);
router.put('/:id', [
  param('id').isMongoId(),
  ...courseValidation
], courseController.updateCourse);
router.delete('/:id', param('id').isMongoId(), courseController.deleteCourse);
router.get('/:id/stats', param('id').isMongoId(), courseController.getCourseStats);

// Campus offering routes
router.post('/:id/offerings', [
  param('id').isMongoId(),
  ...offeringValidation
], courseController.addCampusOffering);

router.put('/:id/offerings/:offeringId', [
  param('id').isMongoId(),
  param('offeringId').isMongoId(),
  ...offeringValidation
], courseController.updateCampusOffering);

router.delete('/:id/offerings/:offeringId', [
  param('id').isMongoId(),
  param('offeringId').isMongoId()
], courseController.removeCampusOffering);

module.exports = router; 