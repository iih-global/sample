var Joi = require('joi');

module.exports = schema => (req, res, next) => {
  const result = Joi.validate(req.body, schema);
  if (result.error) {
    return res.status(422).json({
      errorCause: result.error.name,
      missingParams: result.error.details[0].path,
      message: result.error.details[0].message
    });
  }
  next();
};