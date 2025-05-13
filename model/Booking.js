const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  boardroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boardroom',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  attendees: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationTime: {
    type: Date
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: function() {
        return this.recurring.isRecurring;
      }
    },
    endDate: {
      type: Date,
      required: function() {
        return this.recurring.isRecurring;
      }
    }
  },
  notes: {
    type: String,
    trim: true
  },
  checkIn: {
    time: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  checkOut: {
    time: Date,
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying of bookings
bookingSchema.index({ boardroom: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ user: 1, startTime: 1 });
bookingSchema.index({ status: 1 });

// Validate that endTime is after startTime
bookingSchema.pre('save', function(next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

// Validate that booking doesn't overlap with existing bookings
bookingSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('startTime') || this.isModified('endTime')) {
    const overlappingBooking = await this.constructor.findOne({
      boardroom: this.boardroom,
      _id: { $ne: this._id },
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          startTime: { $lt: this.endTime },
          endTime: { $gt: this.startTime }
        }
      ]
    });

    if (overlappingBooking) {
      next(new Error('Booking overlaps with an existing booking'));
    }
  }
  next();
});

// Method to check if booking is active
bookingSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'confirmed' && 
         this.startTime <= now && 
         this.endTime >= now;
};

// Method to check if booking is upcoming
bookingSchema.methods.isUpcoming = function() {
  const now = new Date();
  return this.status === 'confirmed' && this.startTime > now;
};

// Method to get booking summary
bookingSchema.methods.getSummary = function() {
  const bookingObject = this.toObject();
  delete bookingObject.__v;
  return bookingObject;
};

// Static method to find available time slots
bookingSchema.statics.findAvailableSlots = async function(boardroomId, date, duration) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await this.find({
    boardroom: boardroomId,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $gte: startOfDay },
    endTime: { $lte: endOfDay }
  }).sort({ startTime: 1 });

  // Get boardroom operating hours
  const boardroom = await mongoose.model('Boardroom').findById(boardroomId);
  if (!boardroom) {
    throw new Error('Boardroom not found');
  }

  const dayOfWeek = date.toLocaleLowerCase().split(',')[0];
  const operatingHours = boardroom.operatingHours[dayOfWeek];
  
  if (!operatingHours || !operatingHours.open || !operatingHours.close) {
    throw new Error('Boardroom is not operational on this day');
  }

  // Convert operating hours to Date objects
  const [openHour, openMinute] = operatingHours.open.split(':');
  const [closeHour, closeMinute] = operatingHours.close.split(':');
  
  const openTime = new Date(date);
  openTime.setHours(parseInt(openHour), parseInt(openMinute), 0, 0);
  
  const closeTime = new Date(date);
  closeTime.setHours(parseInt(closeHour), parseInt(closeMinute), 0, 0);

  // Find available slots
  const availableSlots = [];
  let currentTime = new Date(openTime);

  while (currentTime < closeTime) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000);
    
    if (slotEnd > closeTime) break;

    const isSlotAvailable = !bookings.some(booking => 
      (currentTime >= booking.startTime && currentTime < booking.endTime) ||
      (slotEnd > booking.startTime && slotEnd <= booking.endTime) ||
      (currentTime <= booking.startTime && slotEnd >= booking.endTime)
    );

    if (isSlotAvailable) {
      availableSlots.push({
        startTime: new Date(currentTime),
        endTime: new Date(slotEnd)
      });
    }

    currentTime = new Date(slotEnd);
  }

  return availableSlots;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
