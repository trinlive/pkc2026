const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// กำหนดว่าหน้าแรก (/) ให้ไปเรียกใช้ function getHomePage ใน Controller
router.get('/', homeController.getHomePage);

module.exports = router;