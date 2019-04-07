require('./models/db')
const imgtrans = require('./img.js')

const express = require('express');
const path = require('path')
const exphbs = require('express-handlebars')
const bodyparser = require('body-parser')
const cookieParser = require('cookie-parser')
const expressValidator = require('express-validator')
const flash = require('connect-flash')
const session = require('express-session')
const passport = require('passport')
const mongoose = require('mongoose')
const https = require('https');
const fs = require('fs');
const morgan = require('morgan')
const helmet = require('helmet');
const multer = require('multer')({ limits: { fileSize: 1000 * 1024 } })


const sslkey = fs.readFileSync('certificate/ssl-key.pem');
const sslcert = fs.readFileSync('certificate/ssl-cert.pem')

const options = {
  key: sslkey,
  cert: sslcert
};

const employeeController = require('./controllers/employeeController')
mongoose.connect('mongodb://localhost:27017/EmployeeDB')
const schema = new mongoose.Schema({
  Title: String,
  Desc: String,
  Link: String,
  Tag: String
})
const Image = mongoose.model('Image', schema);

var app = express();
const http = express();
app.use(bodyparser.urlencoded({
  extended: true
}))
app.use(morgan('dev'));
app.use(helmet());
app.use(helmet.noCache())
app.use(helmet.frameguard())
app.use(helmet({
  frameguard: false,
}));
app.use(helmet.ieNoOpen())
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: false }))
app.use(cookieParser())
app.set('views', path.join(__dirname, '/views/'));
app.engine('hbs', exphbs({ extname: 'hbs', defaultLayout: 'mainLayout', layoutsDir: __dirname + '/views/layouts' }))
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')))
//express session
app.use(session({
  secret: 'secret',
  saveUninitialized: true,
  resave: true

}))
app.get('/', (req,res)=>{
  res.redirect('/employee/index')
})
app.post('/createUpload', multer.single('image'), (req, res) => {
  let id = uuid()
  console.log('upload', req.file)
  imgtrans.small(req.file.buffer).save(id)
  Image.create({ Title: req.body.Title, Desc: req.body.Desc, Link: id, Tag: req.body.Tag }).then((data) => {
    res.redirect('list')
  })
});
app.use('/images', express.static('./public/upload/'))

//Passport init
app.use(passport.initialize())
app.use(passport.session())
//Express Validator
app.use(expressValidator({
  errorFormatter: function (param, msg, value) {
    var namespace = param.split('.'),
      root = namespace.shift(),
      formParam = root

    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']'
    }
    return {
      param: formParam,
      msg: msg,
      value: value
    }

  }
}))


//Connect Flash 
app.use(flash())
//Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg')
  res.locals.error_msg = req.flash('error_msg')
  res.locals.error = req.flash('error')
  res.locals.user = req.user || null
  next()
})

http.use((req, res, next) => {
  if (req.secure) {
    // request was via https, so do no special handling
    next();
  } else {
    // request was via http, so redirect to https
    res.redirect('https://localhost:3001/');
  }
});

http.listen(process.env.PORT);
console.log('got to http')

https.createServer(options, app).listen(process.env.PORTS);
console.log('redirected')

app.use('/register', employeeController)
app.use('/login', employeeController)
app.use('/index', employeeController)

app.use('/employee', employeeController)