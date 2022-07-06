var Joi = require('joi');

module.exports.postStore = Joi.object().keys({
    description: Joi.string().required(),
    post_image: Joi.default(null)
});