const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

exports.register = async (req, res) => {
  const { name, username, email,password, role ="student"} = req.body;
  const userExists= await User.findOne({
    $or:[
      {email},
      {username}
    ]
  })
  if(userExists){
    return res.status(400).json({message:"User already exists"})
  }
  const hashPassword= await bcrypt.hash(password,10)
  const user= await User.create({
    name,username,email,role,password:hashPassword
  })
  const token = jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET)

  const origin = req.headers.origin || "";
  const isLocal = origin.includes("localhost");

  res.cookie("token", token, {
    httpOnly: true,
    secure: !isLocal, 
    sameSite: isLocal ? "lax" : "none",
  }).status(201).json({
    message:"User registered successfully",
    token, // ✅ Pass token for LocalStorage fallback
    user:{
        id:user._id,
        name:user.name,
        username:user.username,
        role:user.role,
        email:user.email,
        password:user.password
    }})

};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      $or: [{ email }],
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const origin = req.headers.origin || "";
    const isLocal = origin.includes("localhost");

    res.cookie("token", token, {
      httpOnly: true,
      secure: !isLocal, 
      sameSite: isLocal ? "lax" : "none",
    });

    res.status(200).json({
      message: "Login successful",
      token, // ✅ Pass token for LocalStorage fallback
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUsers=async(req,res)=>{
    const users= await User.find().select("-password")
    res.status(200).json(users)
}
exports.getMe = async (req, res) => {
  res.status(200).json(req.user);
};




exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetURL = `${frontendUrl}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset",
      html: `<p>Click below to reset your password:</p>
             <a href="${resetURL}">${resetURL}</a>`,
    });

    res.status(200).json({ message: "Reset link sent to email" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};







exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash incoming token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const bcrypt = require("bcryptjs");
    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};




exports.logout = (req, res) => {
  const origin = req.headers.origin || "";
  const isLocal = origin.includes("localhost");

  res.cookie("token", "", {
    httpOnly: true,
    secure: !isLocal, 
    sameSite: isLocal ? "lax" : "none",
    expires: new Date(0), 
  });

  res.status(200).json({ message: "Logged out successfully" });
};