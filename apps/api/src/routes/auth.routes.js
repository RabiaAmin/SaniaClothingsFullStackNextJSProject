const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  register,
  login,
  logout,
  getUser,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", upload.single("avatar"), register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/getUser", protect, getUser);
router.put("/update/profile", protect, upload.single("avatar"), updateProfile);
router.put("/update/pawssord", protect, updatePassword);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

module.exports = router;
