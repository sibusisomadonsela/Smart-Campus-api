const mongoose = require('mongoose');

const boardroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  facilities: [{
    type: String,
    enum: [
      'projector',
      'whiteboard',
      'video_conference',
      'audio_system',
      'smart_board',
      'wifi',
      'air_conditioning',
      'telephone',
      'computer',
      'printer'
    ]
  }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    default: 'available'
  },
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  description: {
    type: String,
    trim: true
  }, 
  isActive: {
    type: Boolean,
    default: true
  },
  lastMaintenance: {
    date: Date,
    description: String,
    performedBy: String
  },
  nextMaintenance: {
    date: Date,
    description: String
  }
}, {
  timestamps: true
});

// Compound index for unique boardroom code within a campus
boardroomSchema.index({ campus: 1, code: 1 }, { unique: true });

// Method to get boardroom summary (excluding detailed info)
boardroomSchema.methods.getSummary = function() {
  const boardroomObject = this.toObject();
  delete boardroomObject.operatingHours;
  delete boardroomObject.lastMaintenance;
  delete boardroomObject.nextMaintenance;
  delete boardroomObject.__v;
  return boardroomObject;
};

// Static method to find available boardrooms
boardroomSchema.statics.findAvailable = function(campusId, capacity, date, time) {
  return this.find({
    campus: campusId,
    status: 'available',
    capacity: { $gte: capacity },
    isActive: true
  });
};

// Static method to find boardrooms by facilities
boardroomSchema.statics.findByFacilities = function(campusId, facilities) {
  return this.find({
    campus: campusId,
    facilities: { $all: facilities },
    isActive: true
  });
};

const Boardroom = mongoose.model('Boardroom', boardroomSchema);

module.exports = Boardroom;
