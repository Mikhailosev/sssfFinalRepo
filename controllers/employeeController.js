const express = require('express');
var router = express.Router()
const mongoose = require('mongoose')
let passport = require('passport')
let LocalStrategy = require('passport-local').Strategy
let User = require('../models/db')
const Employee = mongoose.model('Employee')
const multer=require('multer')({limits: { fileSize:1000*1024 }})
const uuid = require('uuid/v4')
const imgtrans = require('../img')


router.get('/register', function (req, res) {
    res.render('register')
})
//REgister user
router.post('/register', function (req, res) {
    let name = req.body.name
    let email = req.body.email
    let username = req.body.username
    let password = req.body.password
    let password2 = req.body.password2
    //Validation
    req.checkBody('name', 'Name is required').notEmpty()
    req.checkBody('email', 'Email is required').notEmpty()

    req.checkBody('email', 'Its not an email').isEmail()

    req.checkBody('username', 'Username is empty').notEmpty()

    req.checkBody('password', 'Password is required').notEmpty()
    req.checkBody('password2', 'Password do not match').equals(req.body.password)

    let errors = req.validationErrors()
    if (errors) {
        res.render('register', {
            errors: errors
        })
    }
    else {
        var newUser = new User({
            name: name,
            email: email,
            username: username,
            password: password
        })
        User.createUser(newUser, function (err, user) {
            if (err) throw err
            console.log(user)
        })
        req.flash('success_msg', 'You are registered and you can now login')

        res.redirect('index')
    }
})

router.get('/login', function (req, res) {
    res.render('login')
})
router.get('/index', function (req, res) {
    res.render('index')
})
router.get('/', ensureAuthenticated, (req, res) => {
    res.render("employee/addOrEdit", {
        viewTitle: "Insert employee"
    })
})
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    else {
        req.flash('error_msg', 'You are not logged in')
        res.redirect('employee/login')
    }

}
//register route


router.post('/', multer.single('image'), (req, res) => {
    if (req.body._id == ''){
        insertRecord(req, res)}
    else
        updateRecord(req, res)
})
router.post('/register', function (req, res) {
    var username = req.body.username
    var password = req.body.password
    var firstname = req.body.firstname
    var lastname = req.body.lastname

    var newuser = new User()
    newuser.username = username
    newuser.password = password
    newuser.firstname = firstname
    newuser.lastname = lastname
    newuser.save(function (err, savedUser) {
        if (err) {
            console.log(err)
            return res.status(500).send()
        }
        return res.status(200).send()
    })
})

function insertRecord(req, res) {
    let id = uuid()
    console.log('upload', req.file)
    imgtrans.small(req.file.buffer).save(id)
    let employee = new Employee()
    employee.fullName = req.body.fullName;
    employee.email = req.body.email;
    employee.mobile = req.body.mobile;
    employee.city = req.body.city;
    employee.img = id;
    employee.save((err, doc) => {
        if (!err)
            res.redirect('employee/list')
        else {
            if (err.name == 'ValidationError') {
                handleValidationError(err, req.body)
                res.render("employee/addOrEdit", {
                    viewTitle: "Insert employee",
                    employee: req.body
                })
            }
            else


                console.log('Error during record insertion')
        }
    })
}
function updateRecord(req, res) {
    Employee.findOneAndUpdate({ _id: req.body._id }, req.body, { new: true }, (err, doc) => {
        if (!err) { res.redirect('/employee/list') }
        else {
            if (err.name == 'ValidationError') {
                handleValidationError(err, req.body)
                res.render('/employee/addOrEdit', {
                    viewTitle: 'Update Employee',
                    employee: req.body
                })
            }
            else
                console.log('Error during record update : ' + err);
        }
    })
}
router.get('/list', (req, res) => {
    Employee.find((err, docs) => {
        if (!err) {
            res.render("employee/list", {
                list: docs
            })
        }
    })
})
function handleValidationError(err, body) {
    for (field in err.errors) {
        switch (err.errors[field].path) {
            case 'fullName':
                body['fullNameError'] = err.errors[field].message
                break;
            case 'email':
                body['emailError'] = err.errors[field].message
                break;
            default:
                break;
        }
    }
}
router.get('/:id', (req, res) => {
    Employee.findById(req.params.id, (err, doc) => {
        if (!err) {
            res.render('employee/addOrEdit', {
                viewTitle: "Update Employee",
                employee: doc
            })
        }
    })
})
router.get('/delete/:id', (req, res) => {
    Employee.findByIdAndRemove(req.params.id, (err, doc) => {
        if (!err) {
            res.redirect('/employee/list')
        }
        else {
            console.log('Error in employee delete :' + err)
        }
    })
})
passport.use(new LocalStrategy(
    function (username, password, done) {
        User.getUserByUsername(username, function (err, user) {
            if (err) throw err;
            if (!user) {
                return done(null, false, { message: 'Unkniwn User' })
            }
            User.comparePassword(password, user.password, function (err, isMatch) {
                if (err) throw err
                if (isMatch) {
                    return done(null, user)
                } else {
                    return done(null, false, { message: 'Invalid password' })
                }
            })
        })
    }))
passport.serializeUser(function (user, done) {
    done(null, user.id)
})
passport.deserializeUser(function (id, done) {
    User.getUserById(id, function (err, user) {
        done(err, user)
    })
})
router.post('/login',
    passport.authenticate('local', { successRedirec: '/', failureRedirect: '/employee/login', failureFlash: true }),
    function (req, res) {
        res.redirect('/employee')
    }
)
router.get('/login', function (req, res) {
    req.logout()
    req.flash('success_msg', 'You Are Logged Out')
    console.log('Logged Out')
    res.redirect('login')
})
module.exports = router