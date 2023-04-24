const jwt = require("jsonwebtoken");
const { idsDecrypter } = require("../helpers");
const { Users } = require("../models");

exports.validate =
  (bodySchema, paramsSchema = null, queryParamsSchema = null) =>
  (req, res, next) => {
    try {
      const options = {
        abortEarly: false,
      };
      let paramsErrors = [];
      let queryParamsErrors = [];
      let bodyErrors = [];
      if (paramsSchema) {
        let result = paramsSchema.validate(req.params, options);
        if (result.error) {
          const { details } = result?.error;
          paramsErrors = details?.map(({ message, path }) => ({
            message: message?.replace(/\"/g, ""),
            key: path[0],
          }));
        }
      }
      if (queryParamsSchema) {
        let result = queryParamsSchema.validate(req.query, options);
        if (result.error) {
          const { details } = result?.error;
          queryParamsErrors = details?.map(({ message, path }) => ({
            message: message?.replace(/\"/g, ""),
            key: path[0],
          }));
        }
      }
      if (bodySchema) {
        let result = bodySchema.validate(req.body, options);
        if (result.error) {
          const { details } = result?.error;
          bodyErrors = details?.map(({ message, path }) => ({
            message: message?.replace(/\"/g, ""),
            key: path[0],
          }));
        }
      }
      if (
        bodyErrors?.length ||
        paramsErrors?.length ||
        queryParamsErrors?.length
      )
        return res.status(422).json({
          status: false,
          message: "The given data was invalid.",
          data: {
            bodyErrors,
            paramsErrors,
            queryParamsErrors,
          },
        });
      next();
    } catch (error) {
      next(error);
    }
  };

exports.decodeToken = async (req, res, next) => {
  try {
    let token = req.params?.token || req.body?.token || req.query?.token;

    const tokenPayload = jwt.verify(token, process.env.JWT_SECRET);
    req.tokenPayload = idsDecrypter(tokenPayload);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({
        status: false,
        message: "Your link has been expired.",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({
        status: false,
        message: "Invalid Token!",
      });
    }
    next(error);
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    let token = req.headers["authorization"];
    if (!token) customError("Token not found.", 404);
    token = token?.split(" ")[1];
    if (!token) customError("Invalid token!.", 400);
    let tokenPayload = jwt.verify(token, process.env.JWT_SECRET);
    if (!tokenPayload?.id) customError("Invalid token!", 401);
    tokenPayload = idsDecrypter(tokenPayload);
    const user = await Users.findByPk(tokenPayload?.id, {
      attributes: {
        exclude: ["password"],
      },
    });
    req.user = user;
    if (Object.keys(req.params).length) {
      req.params = idsDecrypter(req.params);
    }
    if (Object.keys(req.query).length) {
      req.query = idsDecrypter(req.query);
    }
    if (Object.keys(req.body).length) {
      req.body = idsDecrypter(req.body);
    }
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        status: false,
        message:
          "Your login session has been expired. Please login again for continue using this platform.",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        status: false,
        message: "Invalid Token!",
      });
    }
    next(error);
  }
};
