const Joi = require("joi");

module.exports = {
  signupJoiSchema: Joi.object().keys({
    first_name: Joi.string().min(3).max(35).required().label("First name"),
    last_name: Joi.string().min(3).max(35).required().label("Last name"),
    email: Joi.string().email().required().label("Email"),
    password: Joi.string().min(6).max(16).required().label("Password"),
    confirm_password: Joi.valid(Joi.ref("password")).messages({
      "any.only": "Confirm password must match password.",
    }),
  }),
  loginJoiSchema: Joi.object().keys({
    email: Joi.string().email().required().label("Email"),
    password: Joi.string().min(6).max(16).required().label("Password"),
  }),
  accountVerifyJoiSchema: Joi.object().keys({
    token: Joi.string().required().label("Token"),
  }),
  forgotPasswordJoiSchema: Joi.object().keys({
    email: Joi.string().email().required().label("Email"),
  }),
  resetPasswordJoiSchema: Joi.object().keys({
    token: Joi.string().required().label("Token"),
    password: Joi.string().min(6).max(16).required().label("Password"),
    confirm_password: Joi.valid(Joi.ref("password")).messages({
      "any.only": "Confirm password must match password.",
    }),
  }),
};
