const express = require("express");
const router = express.Router();
const {
  addClient,
  updateClient,
  deleteClient,
  getClient,
  getAllClients,
} = require("../controllers/client.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/add", protect, addClient);
router.put("/update/:id", protect, updateClient);
router.delete("/delete/:id", protect, deleteClient);
router.get("/get/:id", protect, getClient);
router.get("/getAll", protect, getAllClients);

module.exports = router;
