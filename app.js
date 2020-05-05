var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var myDate=require("current-date");
var MongoClient = require('mongodb').MongoClient;
var dbs;
MongoClient.connect("mongodb://localhost:27017/",function(err,db){
  if(err) console.log("Database Connection Error");
  dbs = db.db('Marker');
  console.log("Database Connected");
});
// var bodyparser=require('body-parser');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const masterPassword = "test";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);
app.get('/',function(req,res){
  res.render('index');
})

app.get('/home',function(req,res){
  res.render('home')
})

app.get('/addTeacher',function(req,res){
  res.render('teacher')
})

app.get('/addStudent',function(req,res){
  res.render('student')
})

app.post("/studentLogin",function(req,res,next){
  var usn=req.body.usn;
  var pass=req.body.password;
  console.log(req.body);
  dbs.collection('students').findOne({usn:usn,pass:pass},function(err,result){
    if(err) next(e);
    if(result==null)
    {
        res.status(404);
        res.end();
    }
    else
    {
      res.send(result);
    }
  });
})

app.post("/teacherLogin",function(req,res){
  var obj = {e_id:req.body.e_id, pass:req.body.password}
  dbs.collection('teachers').findOne(obj,function(err,result){
    if(err) console.log(err);
    if(result == null){
      res.status(404);
      res.end();
    }
    else{
      dbs.collection('subjects').findOne({sub_id:result.sub_id},function(e,r){
        if(e) next(e);
        if(r==null){
          res.status(500);
          res.end();
        }
        else{
          var finalres={name:result.name, e_id:result.e_id, sub_id:result.sub_id, pass:result.pass, sub_name:r.sub_name};
          res.status(200);
          res.send(finalres);
        }
      })
    }
  });
});

app.post("/changePassword",function(req,res,next){
  var eid=req.body.e_id;
  var oldpassword=req.body.oldpassword;
  var newpass=req.body.newpassword;
  dbs.collection('teachers').findOne({e_id:eid,pass:oldpassword},function(e,r){
    if(e) console.log(e);
    if(r==null){
      res.status(404);
      console.log("hello");
      res.end();
    }else{
      var newvalues={ $set: {pass: newpass}};
      dbs.collection('teachers').updateOne(r,newvalues,function(err,result){
        if(err) { res.status(500);res.end(); next(err); }
        // console.log(res);
        res.status(200);
        res.end();
      })
    }
  })
})

app.post("/cPassword", function (req, res, next) {
  var usn = req.body.usn;
  var oldpassword = req.body.oldpassword;
  var newpass = req.body.newpassword;
  dbs.collection('students').findOne({ usn: usn, pass: oldpassword }, function (e, r) {
    if (e) console.log(e);
    if (r == null) {
      res.status(404);
      console.log("hello");
      res.end();
    } else {
      var newvalues = { $set: { pass: newpass } };
      dbs.collection('students').updateOne(r, newvalues, function (err, result) {
        if (err) { res.status(500); res.end(); next(err); }
        // console.log(res);
        res.status(200);
        res.end();
      })
    }
  })
})



app.get("/generateQR/:subid",function(req,res){
  dbs.collection('subjects').findOne({sub_id:req.params.subid},function(e,r){
    if(e){
     console.log(e);
    }
    else{
      if(r==null){
        // console.log("no data");
        // res.send("no dATA");
        res.status(404);
      }else{
      var qrObj={qr:r.sub_qr};
      console.log(qrObj);
      res.send(qrObj);
      }
    }
  })
})

app.get('/attendence/:stud_id/:sub_id/:qrtext',function(req,res,next){
  var date=myDate('date');
  var stud_id=req.params.stud_id;
  var sub_id=req.params.sub_id;
  var  qrtext=req.params.qrtext;
  var name;
  dbs.collection("subjects").findOne({sub_id:sub_id},function(err,re){
    if(err) next(err);
    if(re==null){
      res.send(500);
      res.end();
    }
    if(re.sub_qr!=qrtext){
      res.status(404);
      res.end();
    }
    else{
    dbs.collection('students').findOne({usn:stud_id},function(e,r){
      if(e) console.log(e);
      if(r==null){
        res.status(500);
        res.end();
      }
      else{
        name=r.name;
        console.log(name);
        dbs.collection(date).countDocuments({ usn: stud_id, stud_name: r.name, sub_id: sub_id },function(e,resu){
          if(e) console.log(e);
          console.log(resu);
          if(resu==0)
          {
            dbs.collection(date).insertOne({ usn: stud_id, stud_name: name, sub_id: sub_id }, function (e, result) {
              if (e) console.log(e);
              console.log("inserted"+result);
              res.status(200)
              res.end()
              // console.log(res);
            })
          }else{
            res.status(409)
            res.end()
            console.log("already exists");
          }
        // console.log(count);
        // if(count==0){
        
          // console.log(r);
        })
      }
    })
    }
  })
 
  // }

})

app.get("/present/:date/:sub_id",function(req,res,next){
  var date=req.params.date;
  var sub_id=req.params.sub_id;
  dbs.collection(date).find({sub_id:sub_id}).toArray(function(e,r){
    if(e) {next(e);}
    if(r==null)
    {
      res.status(404);
      res.end();
    }else{
      res.status(200);
      res.send(r);
    } 
  });

});

app.get("/absent/:date/:sub_id",function(req,res,next){
  var date = req.params.date;
  var sub_id = req.params.sub_id;
  var ar = new Array();
  dbs.collection(date).find({ sub_id: sub_id }).toArray(function (e, r) {
    if (e) {next(e); }
    console.log(r);
    if(r==null){
      res.status(404);
      res.end();
    }else{
      ar=r;
      console.log("Array length is");
      console.log(ar.length);
      var a=new Array();
      for(var i=0;i<ar.length;i++){
        a[i]=ar[i].usn;
      } 
      dbs.collection('students').find({usn: {$nin: a}}).toArray(function(err,result){
        if(err) next(err);
        if(result.length==0){
          console.log("everyone is present");
          res.status(205);
          res.end();
        }else{
          res.send(result);
        }
      })
    }
  });
})


app.post('/login',function(req,res){
  if(req.body.pass == masterPassword){
    res.redirect('/home');
  }
  else{
    res.send("Wrong Password");
  }
})

app.post('/addTeacher',function(req,res,next){
  var obj = { name: req.body.name, e_id: req.body.e_id, sub_id: req.body.sub_id, pass: req.body.e_id  }
  dbs.collection('teachers').insertOne(obj, function(r,e){
    if(e) next(e)
    res.redirect('/addTeacher')
  })
})

app.post('/addStudent',function(req,res,next){
  var obj = { name: req.body.name, usn: req.body.usn, class: req.body.class, pass: req.body.usn  }
  dbs.collection('students').insertOne(obj, function(r,e){
    if(e) next(e)
    res.redirect('/addStudent')
  })
})
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
