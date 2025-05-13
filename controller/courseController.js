const Course = require('../model/Course');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = new Course(req.body);
    await course.save();
    
    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Course code already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all courses with filtering and pagination
exports.getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      department,
      level,
      semester,
      year,
      campus,
      instructor
    } = req.query;

    const query = { isActive: true };

    if (department) query.department = department;
    if (level) query.level = level;
    if (campus) query['campuses.campus'] = campus;
    if (instructor) query['campuses.instructor'] = instructor;
    if (semester && year) {
      query['campuses.semester'] = semester;
      query['campuses.year'] = parseInt(year);
    }

    const courses = await Course.find(query)
      .populate('campuses.campus', 'name code')
      .populate('campuses.instructor', 'firstName lastName email')
      .populate('prerequisites', 'code name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ code: 1 });

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: courses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('campuses.campus', 'name code')
      .populate('campuses.instructor', 'firstName lastName email')
      .populate('prerequisites', 'code name');

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('campuses.campus', 'name code')
     .populate('campuses.instructor', 'firstName lastName email')
     .populate('prerequisites', 'code name');

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Course code already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if course has any active offerings
    const hasActiveOfferings = course.campuses.some(offering => offering.isActive);
    if (hasActiveOfferings) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete course with active offerings'
      });
    }

    await course.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add campus offering to course
exports.addCampusOffering = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Check if offering already exists for this campus and semester
    const existingOffering = course.campuses.find(
      offering => 
        offering.campus.toString() === req.body.campus &&
        offering.semester === req.body.semester &&
        offering.year === req.body.year
    );

    if (existingOffering) {
      return res.status(400).json({
        success: false,
        error: 'Course offering already exists for this campus and semester'
      });
    }

    course.campuses.push(req.body);
    await course.save();

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update campus offering
exports.updateCampusOffering = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { offeringId } = req.params;
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    const offeringIndex = course.campuses.findIndex(
      offering => offering._id.toString() === offeringId
    );

    if (offeringIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Campus offering not found'
      });
    }

    course.campuses[offeringIndex] = {
      ...course.campuses[offeringIndex].toObject(),
      ...req.body
    };

    await course.save();

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Remove campus offering
exports.removeCampusOffering = async (req, res) => {
  try {
    const { offeringId } = req.params;
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    const offering = course.campuses.id(offeringId);
    if (!offering) {
      return res.status(404).json({
        success: false,
        error: 'Campus offering not found'
      });
    }

    if (offering.enrolled > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove offering with enrolled students'
      });
    }

    offering.remove();
    await course.save();

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Search courses
exports.searchCourses = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const courses = await Course.find({
      $or: [
        { code: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    })
    .populate('campuses.campus', 'name code')
    .populate('campuses.instructor', 'firstName lastName email')
    .limit(10);

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get course statistics
exports.getCourseStats = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    const stats = {
      totalOfferings: course.campuses.length,
      activeOfferings: course.campuses.filter(o => o.isActive).length,
      totalEnrolled: course.campuses.reduce((sum, o) => sum + o.enrolled, 0),
      totalCapacity: course.campuses.reduce((sum, o) => sum + o.capacity, 0),
      offeringsBySemester: course.campuses.reduce((acc, o) => {
        const key = `${o.semester}-${o.year}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      offeringsByCampus: course.campuses.reduce((acc, o) => {
        const campusId = o.campus.toString();
        acc[campusId] = (acc[campusId] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 