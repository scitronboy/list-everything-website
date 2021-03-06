Account = require('../models/account')
passport = require('passport');

// const { body,validationResult } = require('express-validator/check');
// const { sanitizeBody } = require('express-validator/filter');


exports.index = function(req, res) {
  res.render('index', { config: global.gConfig, req: req, error: req.flash('error')});
}

exports.about = function(req, res) {
  res.render('about', { config: global.gConfig, req: req });
}

exports.contact = function(req, res) {
  res.render('contact', { config: global.gConfig, req: req });
}

exports.help = function(req, res) {
  res.render('help', { config: global.gConfig, req: req });
}

exports.privacy_tos = function(req, res) {
  res.render('privacy_tos', { config: global.gConfig, req: req });
}

exports.login_get = function(req, res) {
  if (req.query.next) {
    req.session.redirectTo = req.query.next;
  }
  res.render('login', {config: global.gConfig,
    error: req.flash('error'), req: req
  })
}

exports.register_get = function(req, res) {
  res.render('register', {config: global.gConfig, req: req})
}

exports.register_post = function(req, res) {
  Account.register(new Account({username: req.body.username}), req.body.password, function (err, account) {
    if (err) {
      return res.render('register', {error: err.message, req: req, config: global.gConfig});
    }
    
    passport.authenticate('local')(req, res, function () {
      req.session.save(function (err) {
        if (err) {
          return next(err);
        }
        res.redirect('/?intro=true&account=created');
      });
    });
  });
}

exports.login_after_post = function(req, res) {
  if (req.session.redirectTo && req.session.redirectTo.charAt(0) == '/') {
    var rt = req.session.redirectTo;
    delete req.session.redirectTo;
//     req.flash('error', "You were successfuly logged in");
    res.redirect(rt);
  } else {
    res.redirect('/');
  }
}

exports.logout = function(req, res) {
  req.logout();
  req.flash('error', 'You are now signed out');
  res.redirect('/');
}
