const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      
    },
    username:{
      type:String,
      required:true,
      unique:true
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["mentor", "student"],
      default: "student",
    },
    online: {
  type: Boolean,
  default: false,
},

lastActive: {
  type: Date,
  default: Date.now,
},
    resetPasswordToken: String,
    resetPasswordExpire: Date,

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);