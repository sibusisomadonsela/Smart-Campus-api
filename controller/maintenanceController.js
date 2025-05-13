const Maintenance = require('../model/Maintenance');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Create a new maintenance request
exports.createMaintenance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const maintenance = new Maintenance({
      ...req.body,
      reportedBy: req.user.id // Assuming user is authenticated
    });

    await maintenance.save();
    
    res.status(201).json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all maintenance requests with filtering and pagination
exports.getMaintenanceRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      priority,
      boardroom,
      assignedTo,
      reportedBy,
      startDate,
      endDate
    } = req.query;

    const query = { isActive: true };

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (boardroom) query.boardroom = boardroom;
    if (assignedTo) query.assignedTo = assignedTo;
    if (reportedBy) query.reportedBy = reportedBy;
    if (startDate && endDate) {
      query.reportedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const maintenance = await Maintenance.find(query)
      .populate('boardroom', 'name code')
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ priority: 1, reportedAt: -1 });

    const total = await Maintenance.countDocuments(query);

    res.json({
      success: true,
      data: maintenance,
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

// Get maintenance request by ID
exports.getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('boardroom', 'name code')
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('cost.approvedBy', 'firstName lastName email')
      .populate('notes.addedBy', 'firstName lastName email');

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update maintenance request
exports.updateMaintenance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('boardroom', 'name code')
     .populate('reportedBy', 'firstName lastName email')
     .populate('assignedTo', 'firstName lastName email');

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete maintenance request
exports.deleteMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
    }

    // Only allow deletion of pending or cancelled requests
    if (!['pending', 'cancelled'].includes(maintenance.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active or completed maintenance requests'
      });
    }

    maintenance.isActive = false;
    await maintenance.save();

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

// Assign maintenance staff
exports.assignMaintenance = async (req, res) => {
  try {
    const { assignedTo, estimatedCompletion } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
    }

    if (maintenance.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Can only assign pending maintenance requests'
      });
    }

    maintenance.assignedTo = assignedTo;
    maintenance.estimatedCompletion = estimatedCompletion;
    maintenance.status = 'assigned';
    await maintenance.save();

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update maintenance status
exports.updateStatus = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      pending: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[maintenance.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${maintenance.status} to ${status}`
      });
    }

    maintenance.status = status;
    if (resolution) maintenance.resolution = resolution;
    await maintenance.save();

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add maintenance note
exports.addNote = async (req, res) => {
  try {
    const { content } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
    }

    maintenance.notes.push({
      content,
      addedBy: req.user.id // Assuming user is authenticated
    });

    await maintenance.save();

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update maintenance cost
exports.updateCost = async (req, res) => {
  try {
    const { amount, currency, parts } = req.body;
    
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
    }

    if (maintenance.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Can only update cost for in-progress maintenance'
      });
    }

    maintenance.cost = {
      amount,
      currency,
      approvedBy: req.user.id, // Assuming user is authenticated
      approvedAt: new Date()
    };

    if (parts) maintenance.parts = parts;
    await maintenance.save();

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get maintenance statistics
exports.getMaintenanceStats = async (req, res) => {
  try {
    const { boardroom } = req.query;
    
    if (!boardroom) {
      return res.status(400).json({
        success: false,
        error: 'Boardroom ID is required'
      });
    }

    const stats = await Maintenance.getStats(boardroom);

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

// Get overdue maintenance
exports.getOverdueMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findOverdue()
      .populate('boardroom', 'name code')
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 