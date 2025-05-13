const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  level: {
    type: String,
    enum: ['undergraduate', 'graduate', 'postgraduate'],
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  campuses: [{
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true
    },
    semester: {
      type: String,
      enum: ['fall', 'spring', 'summer'],
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      endTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      location: {
        type: String,
        required: true,
        trim: true
      }
    }],
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    enrolled: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  syllabus: {
    objectives: [String],
    topics: [String],
    textbooks: [{
      title: String,
      author: String,
      isbn: String,
      isRequired: Boolean
    }],
    gradingPolicy: {
      assignments: Number,
      midterm: Number,
      final: Number,
      participation: Number
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
courseSchema.index({ code: 1 });
courseSchema.index({ department: 1 });
courseSchema.index({ 'campuses.campus': 1 });
courseSchema.index({ 'campuses.instructor': 1 });

// Validate that endDate is after startDate for each campus offering
courseSchema.pre('save', function(next) {
  for (const offering of this.campuses) {
    if (offering.endDate <= offering.startDate) {
      next(new Error(`End date must be after start date for campus offering ${offering.campus}`));
    }
  }
  next();
});

// Validate that schedule times are valid
courseSchema.pre('save', function(next) {
  for (const offering of this.campuses) {
    for (const session of offering.schedule) {
      const start = new Date(`2000-01-01T${session.startTime}`);
      const end = new Date(`2000-01-01T${session.endTime}`);
      if (end <= start) {
        next(new Error(`End time must be after start time for schedule in campus offering ${offering.campus}`));
      }
    }
  }
  next();
});

// Method to check if course is offered in a specific campus
courseSchema.methods.isOfferedInCampus = function(campusId) {
  return this.campuses.some(offering => 
    offering.campus.toString() === campusId.toString() && 
    offering.isActive
  );
};

// Method to get current offerings
courseSchema.methods.getCurrentOfferings = function() {
  const now = new Date();
  return this.campuses.filter(offering => 
    offering.isActive && 
    offering.startDate <= now && 
    offering.endDate >= now
  );
};

// Method to get course summary
courseSchema.methods.getSummary = function() {
  const courseObject = this.toObject();
  delete courseObject.syllabus;
  delete courseObject.__v;
  return courseObject;
};

// Static method to find courses by campus
courseSchema.statics.findByCampus = function(campusId, semester, year) {
  const query = {
    'campuses.campus': campusId,
    'campuses.isActive': true
  };

  if (semester && year) {
    query['campuses.semester'] = semester;
    query['campuses.year'] = year;
  }

  return this.find(query)
    .populate('campuses.campus', 'name code')
    .populate('campuses.instructor', 'firstName lastName email');
};

// Static method to find courses by instructor
courseSchema.statics.findByInstructor = function(instructorId, semester, year) {
  const query = {
    'campuses.instructor': instructorId,
    'campuses.isActive': true
  };

  if (semester && year) {
    query['campuses.semester'] = semester;
    query['campuses.year'] = year;
  }

  return this.find(query)
    .populate('campuses.campus', 'name code');
};

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
