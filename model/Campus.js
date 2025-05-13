const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }, 
  description: {
    type: String,
    trim: true
  },
  province: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }, 
}, {
  timestamps: true
});


// Method to get campus summary (excluding detailed facility info)
campusSchema.methods.getSummary = function() {
  const campusObject = this.toObject();
  delete campusObject.__v;
  return campusObject;
};


const Campus = mongoose.model('Campus', campusSchema);

module.exports = Campus;
