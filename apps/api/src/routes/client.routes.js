const express = require('express');
const router = express.Router();
const {
  addClient,
  updateClient,
  deleteClient,
  getClient,
  getAllClients,
} = require('../controllers/client.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');

router.post('/add', protect, authorize('client.create'), addClient);
router.put('/update/:id', protect, authorize('client.update'), updateClient);
router.delete('/delete/:id', protect, authorize('client.delete'), deleteClient);
router.get('/get/:id', protect, authorize('client.read'), getClient);
router.get('/getAll', protect, authorize('client.read'), getAllClients);

module.exports = router;
