const Campus = require('../model/Campus');
const User = require('../model/User');
const { validationResult } = require('express-validator');

// Create a new campus
exports.createCampus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const campus = new Campus(req.body);
    await campus.save();
    
    res.status(201).json({
      success: true,
      data: campus
    });
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({
        success: false,
        error: 'Campus name or code already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error creating campus'
    });
  }
};

// Get all campuses with pagination and filtering
exports.getCampuses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.province) filter.province = req.query.province;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const campuses = await Campus.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Campus.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: campuses,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching campuses'
    });
  }
};

// Get single campus by ID
exports.getCampusById = async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
    }

    res.status(200).json({
      success: true,
      data: campus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching campus'
    });
  }
};

// Update campus
exports.updateCampus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const campus = await Campus.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!campus) {
      return res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
    }

    res.status(200).json({
      success: true,
      data: campus
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Campus name or code already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error updating campus'
    });
  }
};

// Delete campus
exports.deleteCampus = async (req, res) => {
  try {
    // Check if there are any users associated with this campus
    const userCount = await User.countDocuments({ campus: req.params.id });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete campus with associated users. Please reassign or remove users first.'
      });
    }

    const campus = await Campus.findByIdAndDelete(req.params.id);

    if (!campus) {
      return res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting campus'
    });
  }
};

// Toggle campus active status
exports.toggleCampusStatus = async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    
    if (!campus) {
      return res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
    }

    campus.isActive = !campus.isActive;
    await campus.save();

    res.status(200).json({
      success: true,
      data: {
        isActive: campus.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error toggling campus status'
    });
  }
};

// Get campus statistics
exports.getCampusStats = async (req, res) => {
  try {
    const campusId = req.params.id;
    
    // Verify campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
    }

    // Get user counts by role
    const userStats = await User.aggregate([
      { $match: { campus: campusId } },
      { $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total user count
    const totalUsers = await User.countDocuments({ campus: campusId });

    // Get active/inactive user counts
    const activeUsers = await User.countDocuments({ 
      campus: campusId,
      isActive: true 
    });

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: userStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching campus statistics'
    });
  }
};

// Search campuses
exports.searchCampuses = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const campuses = await Campus.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { province: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    res.status(200).json({
      success: true,
      data: campuses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error searching campuses'
    });
  }
};
