const { generateJwtToken } = require("../helpers");
const { Users } = require("../models");
const {
  sendAccountVerificationEmail,
  sendResetPasswordEmail,
} = require("../services/emails");

exports.signup = async (req, res, next) => {
  try {
    const user = await Users.create(req.body, { hooks: true });
    if (!user)
      customError(
        "Your account not created. Please check your information.",
        422
      );
    await sendAccountVerificationEmail(user);
    res.status(201).json({
      status: true,
      message:
        "Account created successfully. Please check your email for account verification.",
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyAccount = async (req, res, next) => {
  try {
    const user = await Users.findOne({
      where: {
        email: req.tokenPayload?.email,
      },
    });
    if (!user) customError("User not found!", 400);
    if (user?.get()?.is_verified)
      customError("Your account already verified.", 422);
    await user.update({ is_verified: true });
    res.status(200).json({
      status: true,
      message: "Your account verified successful.",
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await Users.findOne({
      where: {
        email,
      },
    });
    if (!user) customError("Invalid email or password.", 400);
    if (!user.isValidPassword(password))
      customError("Invalid email or password.", 400);
    if (!user.is_verified) {
      await sendAccountVerificationEmail(user);
      customError(
        "Account not verified. Please check your email and verify account.",
        422
      );
    }
    res.status(200).json({
      status: true,
      message: "Login successful.",
      token: generateJwtToken({ id: user?.get()?.id }),
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({
      where: { email },
    });
    if (!user) customError("Invalid email!", 400);
    await sendResetPasswordEmail(user);
    res.status(200).json({
      status: true,
      message: "Please check your email for forgot password.",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await Users.findOne({
      where: {
        email: req.tokenPayload?.email,
      },
    });
    if (!user) customError("User not found!", 400);
    await user.update({ password });
    res.status(200).json({
      status: true,
      message: "Your password reset successful.",
    });
  } catch (error) {
    next(error);
  }
};
