var List = require('../models/list');
var ListItem = require('../models/list_item');
var shortid = require('shortid');
var async = require('async');
var _ = require('underscore');

var { check, validationResult } = require('express-validator/check');
var { sanitizeBody } = require('express-validator/filter');

exports.new_get = function (req, res) {
  res.render('new_list', {config: global.gConfig, req: req, csrf: req.csrfToken() });
}

exports.new_post = [
  
  check('name', "List name must be between 3 and 50 characters")
  .isLength({min: 3, max: 50})
  .trim()
  ,
  
  sanitizeBody('name').trim().escape()
  ,
  
  check('description', "Description must be shorter than 200 characters")
  .isLength({max: 200})
  ,
                  
  sanitizeBody('description')
  .trim().escape()
  ,
  
  check('type', "Please choose a list type")
  .trim().escape()
  ,
  
  (req, res, next) => {
    
    const errors = validationResult(req);
    
    var list = new List({
      name: req.body.name,
      description: req.body.description,
      votable: req.body.votable ? true : false,
      list_type: req.body.type,
      allow_submissions: req.body.allow_submissions ? true : false,
      moderate_submissions: req.body.moderate_submissions ? true : false,
      public_list: req.body.public ? true : false,
      author: req.user._id
    });
    
    if (!errors.isEmpty()) {
      res.render('new_list', {config: global.gConfig, error: errors.array()[0].msg, req: req, csrf: req.csrfToken()});
      return;
    }
    
    list.save(function (err) {
      if (err) { return next(err); }
      res.redirect(list.url + "/add?first=true");
    });
  }
  
];

exports.explore = function(req, res) {
  res.render('explore', {config: global.gConfig, req: req});
}

exports.list_detail = function(req, res, next) {
  if (shortid.isValid(req.params.list_id)) {
    List.findOne({url_id: req.params.list_id})
    .populate('contents author')
    .exec(function(err, list) {
      if (err) return next(err);
      if (list==null) {
        var err = new Error("List not found");
        err.status = 404;
        return next(err);
      }
      
      res.render('list_detail', {config: global.gConfig, list: list, req: req});
    });
  } else {
    next();
  }
}

exports.list_add_get = function(req, res, next) {
  if (shortid.isValid(req.params.list_id)) {
    List.findOne({url_id: req.params.list_id})
    .populate('contents author')
    .exec(function(err, list) {
      if (err) return next(err);
      if (list==null) {
        var err = new Error("List not found");
        err.status = 404;
        return next(err);
      }
      
      res.render('list_add', {config: global.gConfig, list: list, req: req});
    });
  }
  else {
    var err = new Error("Invalid list code");
    err.status = 404;
    return next(err);
  }
}

exports.list_add_post = [
//   check('*', "List items must be shorter than 100 characters")
//   .isLength({min: 1, max: 100})
//   .trim(),
  
  sanitizeBody('*').trim().escape(),
  
  (req, res, next) => {
    if (shortid.isValid(req.params.list_id)) {
      List.findOne({url_id: req.params.list_id})
      .populate('contents author')
      .exec(function(err, list) {
        if (err) {return next(err);}
        if (list==null) {
          var err = new Error("List not found");
          err.status = 404;
          return next(err);
        }
        
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
          res.render('list_add', {config: global.gConfig, error: errors.array()[0].msg, req: req, list: list});
          return;
        }
        
        for (i = 0; i < _.size(req.body); i++) {
          let item = new ListItem({
            name: req.body[list.contents.length.toString()]
          });
          item.save(function (err) {
            if (err) { return next(err); }
          });
          list.contents.push(item);
        }
        
        list.save(function (err) {
            if (err) {return next(err);}
            res.redirect(list.url);
        });
      });
    } else {
      console.log("OOOOFFFFFFFFFFF");
      var err = new Error("Invalid list code");
      err.status = 404;
      return next(err);
    }
  }
];

exports.list_ajax_action = function(req, res) {
  if (shortid.isValid(req.params.list_id)) {
    if (req.body.action == "star" || req.body.action == "unstar") {
      List.findOne({url_id: req.params.list_id})
      .exec(function(err, list) {
        if (err || list==null || !req.user) {
          res.send(JSON.stringify({completed: "error"}));
          return;
        }
        if (req.body.action == "star") {
          // Ensure that there is only one copy of the user in the stars array:
          while (list.stars.indexOf(req.user._id) > -1) {
            list.stars.splice(list.stars.indexOf(req.user._id), 1);
          }
          list.stars.push(req.user._id);
          list.save(function (err) {
            if (err) {
              res.send(JSON.stringify({completed: "error"}));
              return;
            }
            res.send(JSON.stringify({completed: "star"}));
            return;
          });
          
        }
        if (req.body.action == "unstar") {
          if (list.stars.indexOf(req.user._id) > -1) {
            // Remove all copies of user from stars array:
            while (list.stars.indexOf(req.user._id) > -1) {
              list.stars.splice(list.stars.indexOf(req.user._id), 1);
            }
            list.save(function (err) {
              if (err) {
                res.send(JSON.stringify({completed: "error"}));
                return;
              }
            });
          }
          res.send(JSON.stringify({completed: "unstar"}));
          return;
        }
      });
    } else {
      ListItem.findOne({id: req.body.item_id})
      .exec(function(err, item) {
        if (item==null || !req.user || err) {
          res.send(JSON.stringify({completed: "error"}));
          return;
        }
        
        if (req.body.action == "upvote") {
          // Ensure that there is only one copy of the user in the upvotes array:
          while (item.votes.indexOf(req.user._id) > -1) {
            item.votes.splice(item.votes.indexOf(req.user._id), 1);
          }
          item.votes.push(req.user._id);
          item.save(function (err) {
            if (err) {
              console.log(err);
              res.send(JSON.stringify({completed: "error"}));
              return;
            }
            res.send(JSON.stringify({completed: "upvote"}));
            return;
          });
        } else if (req.body.action == "downvote") {
          if (item.votes.indexOf(req.user._id) > -1) {
            // Remove all copies of user from votes array:
            while (item.votes.indexOf(req.user._id) > -1) {
              item.votes.splice(item.votes.indexOf(req.user._id), 1);
            }
            item.save(function (err) {
              if (err) {
                console.log(err);
                res.send(JSON.stringify({completed: "error"}));
                return;
              }
            });
          }
          res.send(JSON.stringify({completed: "downvote"}));
          return;
        } else {
          res.send(JSON.stringify({completed: "error"}));
          return;
        }
      });
    }
  } else {
    res.send(JSON.stringify({completed: "error"}));
    return;
  }
}
