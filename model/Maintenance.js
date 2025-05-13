const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  boardroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boardroom',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['repair', 'cleaning', 'equipment', 'furniture', 'electrical', 'plumbing', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  estimatedCompletion: {
    type: Date
  },
  actualCompletion: {
    type: Date
  },
  resolution: {
    type: String,
    trim: true
  },
  cost: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    }
  },
  parts: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    cost: {
      type: Number,
      min: 0
    }
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    content: {
      type: String,
      required: true,
      trim: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
maintenanceSchema.index({ boardroom: 1, status: 1 });
maintenanceSchema.index({ reportedBy: 1 });
maintenanceSchema.index({ assignedTo: 1 });
maintenanceSchema.index({ type: 1, priority: 1 });
maintenanceSchema.index({ reportedAt: -1 });

// Validate that completion dates are in correct order
maintenanceSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'assigned':
        this.assignedAt = now;
        break;
      case 'in_progress':
        this.startedAt = now;
        break;
      case 'completed':
        this.completedAt = now;
        this.actualCompletion = now;
        break;
    }
  }

  if (this.actualCompletion && this.estimatedCompletion && 
      this.actualCompletion < this.estimatedCompletion) {
    this.estimatedCompletion = this.actualCompletion;
  }

  next();
});

// Method to check if maintenance is overdue
maintenanceSchema.methods.isOverdue = function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  return this.estimatedCompletion && now > this.estimatedCompletion;
};

// Method to get maintenance summary
maintenanceSchema.methods.getSummary = function() {
  const maintenanceObject = this.toObject();
  delete maintenanceObject.__v;
  delete maintenanceObject.notes;
  return maintenanceObject;
};

// Static method to find active maintenance requests
maintenanceSchema.statics.findActive = function(boardroomId) {
  return this.find({
    boardroom: boardroomId,
    status: { $in: ['pending', 'assigned', 'in_progress'] },
    isActive: true
  }).sort({ priority: 1, reportedAt: 1 });
};

// Static method to find maintenance history
maintenanceSchema.statics.findHistory = function(boardroomId, limit = 10) {
  return this.find({
    boardroom: boardroomId,
    status: { $in: ['completed', 'cancelled'] }
  })
  .sort({ completedAt: -1 })
  .limit(limit)
  .populate('reportedBy', 'firstName lastName email')
  .populate('assignedTo', 'firstName lastName email');
};

// Static method to find overdue maintenance
maintenanceSchema.statics.findOverdue = function() {
  const now = new Date();
  return this.find({
    status: { $in: ['assigned', 'in_progress'] },
    estimatedCompletion: { $lt: now },
    isActive: true
  }).sort({ estimatedCompletion: 1 });
};

// Static method to get maintenance statistics
maintenanceSchema.statics.getStats = async function(boardroomId) {
  const stats = await this.aggregate([
    {
      $match: {
        boardroom: mongoose.Types.ObjectId(boardroomId)
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$cost.amount' }
      }
    }
  ]);

  const typeStats = await this.aggregate([
    {
      $match: {
        boardroom: mongoose.Types.ObjectId(boardroomId)
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgResolutionTime: {
          $avg: {
            $subtract: ['$completedAt', '$reportedAt']
          }
        }
      }
    }
  ]);

  return {
    byStatus: stats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        totalCost: curr.totalCost
      };
      return acc;
    }, {}),
    byType: typeStats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        avgResolutionTime: curr.avgResolutionTime
      };
      return acc;
    }, {})
  };
};

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);

module.exports = Maintenance;
