const {
  signup,
  login,
  verifyAccount,
  forgotPassword,
  resetPassword,
} = require("../../controllers/auth.controller");
const { validate, decodeToken } = require("../../middlewares");
const {
  signupJoiSchema,
  loginJoiSchema,
  accountVerifyJoiSchema,
  forgotPasswordJoiSchema,
  resetPasswordJoiSchema,
} = require("../../validations/auth");
const router = require("express").Router();

router.post("/signup", validate(signupJoiSchema), signup);
router.post(
  "/account-verify",
  validate(accountVerifyJoiSchema),
  decodeToken,
  verifyAccount
);
router.post("/login", validate(loginJoiSchema), login);
router.post(
  "/forgot-password",
  validate(forgotPasswordJoiSchema),
  forgotPassword
);
router.post(
  "/reset-password",
  validate(resetPasswordJoiSchema),
  decodeToken,
  resetPassword
);

module.exports = router;
