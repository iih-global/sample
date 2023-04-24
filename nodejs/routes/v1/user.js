const { getUser } = require("../../controllers/user.controller");
const { verifyToken } = require("../../middlewares");
const router = require("express").Router();

router.get("/me", verifyToken, getUser);

module.exports = router;
