import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    lastName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: ["seeker", "owner", "admin"], 
      default: "seeker", 
      required: true 
    },
    phone: { 
      type: String, 
      trim: true, 
      default: "" 
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;