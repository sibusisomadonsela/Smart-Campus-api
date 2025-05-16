const User = require('../model/User');
const Campus = require('../model/Campus');
const { validationResult } = require('express-validator');
const fs = require("fs").promises;
const emailer = require('../services/emailer');

// Create a new user
exports.createUser = async (req, res) => {
  try {
    console.log('Creating user with data:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify campus exists
    const campus = await Campus.findById(req.body.campus);
    if (!campus) {
      console.log('Campus not found:', req.body.campus);
      return res.status(400).json({
        success: false,
        error: 'Invalid campus ID'
      });
    }

    const user = new User(req.body);
    console.log('Attempting to save user:', user);

    let emailBody = await fs.readFile( './templates/accountConfirmationTemplate.html');
    emailBody = emailBody.toString();
    emailBody = emailBody.replace('[User Name]', user.firstName + " " + user.lastName);
    await emailer.sendReviewHtmlBody(user.email, emailBody, 'Account Confirmation');    
    
    await user.save();
    console.log('User saved successfully');
    
    // Populate campus data before sending response
    await user.populate('campus', 'name code province');
    
    res.status(201).json({
      success: true,
      data: user.getPublicProfile()
    });
  } catch (error) {
    console.log('Error creating user:', error);
    if (error.code === 11000) {
      console.log('Duplicate key error:', error.keyPattern);
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error creating user'
    });
  }
};

// Get all users with pagination and filtering
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.department) filter.department = req.query.department;
    if (req.query.campus) filter.campus = req.query.campus;

    const users = await User.find(filter)
      .select('-password')
      .populate('campus', 'name code province')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching users'
    });
  }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('campus', 'name code province');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching user'
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // If campus is being updated, verify it exists
    if (req.body.campus) {
      const campus = await Campus.findById(req.body.campus);
      if (!campus) {
        return res.status(400).json({
          success: false,
          error: 'Invalid campus ID'
        });
      }
    }

    // Prevent password update through this endpoint
    if (req.body.password) {
      delete req.body.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { 
        new: true,
        runValidators: true
      }
    )
    .select('-password')
    .populate('campus', 'name code province');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error updating user'
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting user'
    });
  }
};

// Update user password
exports.updatePassword = async (req, res) => {
  try {
    console.log(req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and new password'
      });
    }

    const user = await User.findOne({ email });
    console.log(user);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.password = password;
    await user.save();

    let emailBody = await fs.readFile( './templates/passwordResetTemplate.html');
    emailBody = emailBody.toString();
    emailBody = emailBody.replace('[User Name]', user.firstName + " " + user.lastName);
    await emailer.sendReviewHtmlBody(user.email, emailBody, 'Password Reset');    

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error updating password'
    });
  }
};

// Toggle user active status
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error toggling user status'
    });
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { studentId: { $regex: query, $options: 'i' } }
      ]
    }).select('-password').limit(10);

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error searching users'
    });
  }
};

// Get users by campus
exports.getUsersByCampus = async (req, res) => {
  try {
    const { campusId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verify campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
    }

    const users = await User.find({ campus: campusId })
      .select('-password')
      .populate('campus', 'name code province')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ campus: campusId });

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching users by campus'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Populate campus data before sending response
    await user.populate('campus', 'name code province');

    res.status(200).json({
      success: true,
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error during login'
    });
  }
};
