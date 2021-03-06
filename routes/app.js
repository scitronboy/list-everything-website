var express = require('express');
var router = express.Router();
var passport = require('passport');

var appController = require('../controllers/appController.js')

/* GET home page. */
router.get('/', appController.index);
router.get('/about', appController.about);
router.get('/contact', appController.contact);
router.get('/help', appController.help);
router.get('/privacy-tos', appController.privacy_tos);

router.get('/login', appController.login_get);
router.post('/login', passport.authenticate('local', {failureFlash: true, failureRedirect: '/login'}), appController.login_after_post);
router.get('/register', appController.register_get);
router.post('/register', appController.register_post);
router.get('/logout', appController.logout);

module.exports = router;
