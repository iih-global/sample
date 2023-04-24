const { idsEncrypter } = require("../helpers");
const { Users } = require("../models");

exports.getUser = async (req, res, next) => {
  try {
    const user = await Users.findByPk(req.user?.get()?.id, {
      attributes: {
        exclude: ["password", "deleted_at"],
      },
    });
    if (!user) customError("Your data not found.", 404);
    res.status(200).json({
      status: true,
      message: "Your data fetched successful.",
      data: idsEncrypter(user),
    });
  } catch (error) {
    next(error);
  }
};
