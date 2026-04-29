const express = require("express");
const router = express.Router();
const {
  createBusiness,
  updateBusiness,
  getBusiness,
} = require("../controllers/business.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create", protect, createBusiness);
router.put("/update", protect, updateBusiness);
router.get("/get", protect, getBusiness);

module.exports = router;
