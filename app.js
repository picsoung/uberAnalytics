var express = require('express');
var async = require('async');
var Datastore = require('nedb');
var moment = require('moment');
var db = {};
var schedule = require('node-schedule');
var request = require('request');

var config = require('./config');

var app = express();

// Connect to an NeDB database
db.points = new Datastore({ filename: 'db/points', autoload: true });
db.routes = new Datastore({ filename: 'db/routes', autoload: true });
db.prices = new Datastore({ filename: 'db/prices', autoload: true });

var routes =[{start:"lax", end:"dtla"},{start:"dtla", end:"lax"},
 {start:"lax", end:"sm"},{start:"sm", end:"lax"},
 {start:"lax", end:"hwd"},{start:"hwd", end:"lax"},
 {start:"dtla", end:"sm"},{start:"sm", end:"dtla"},
 {start:"dtla", end:"hwd"},{start:"hwd", end:"dtla"},
 {start:"sm", end:"hwd"},{start:"sm", end:"lax"},
 {start:"jfk", end:"gct"},{start:"gct", end:"jfk"},
 {start:"jfk", end:"aaal"},{start:"aaal", end:"jfk"},
 {start:"jfk", end:"brky"},{start:"brky", end:"jfk"},
 {start:"gct", end:"aaal"},{start:"aaal", end:"gct"},
 {start:"gct", end:"brky"},{start:"brky", end:"gct"},
 {start:"aaal", end:"brky"},{start:"aaal", end:"jfk"},
 {start:"sfo", end:"acs"},{start:"acs", end:"sfo"},
 {start:"sfo", end:"pwll"},{start:"pwll", end:"sfo"},
 {start:"sfo", end:"warf"},{start:"warf", end:"sfo"},
 {start:"acs", end:"pwll"},{start:"pwll", end:"acs"},
 {start:"acs", end:"warf"},{start:"warf", end:"acs"},
 {start:"pwll", end:"warf"},{start:"pwll", end:"sfo"}]

app.get('/',function(req, res){
  res.render('index');  
});

//Seed database
app.get('/seed',function(req,res){
	// db.points.insert({name:"San Francisco Downtown",slug:"sf_downtown",lat:"37.7833", lon:"-122.4167"});
	// db.points.insert({name:"San Francisco Airport",slug:"sf_airport",lat:"37.7833", lon:"-122.4167"});
	db.points.insert({name:"LAX (Los Angeles International Airport)",slug:"lax",lat:"33.945452",lon:"-118.399974"})
db.points.insert({name:"Downtown LA (Walt Disney Concert Hall)",slug:"dtla",lat:"34.055515",lon:"-118.250039"})
db.points.insert({name:"Santa Monica (Third Street Promenade)",slug:"sm",lat:"34.016243",lon:"-118.496159"})
db.points.insert({name:"Hollywood (Mann Theatres)",slug:"hwd",	lat:"34.102298",lon:"-118.340992"})
			
db.points.insert({name:"JFK (John F. Kennedy International Airport)",slug:"jfk",lat:"40.655839",lon:"-73.807594"})
db.points.insert({name:"Manhattan (Grand Central Terminal)",slug:"gct",lat:"40.752466",lon:"-73.976886"})
db.points.insert({name:"Upper Manhattan (American Academy of Arts and Letters)",slug:"aaal",lat:"40.833721",lon:"-73.947461"})
db.points.insert({name:"Brooklyn (Barclays Center)",slug:"brky",lat:"40.682907",lon:"-73.975255"})
			
db.points.insert({name:"SFO (San Francisco International Airport)",slug:"sfo",lat:"37.625732",lon:"-122.377807"})
db.points.insert({name:"Golden Gate Park (California Academy of Sciences)",slug:"acs",lat:"37.770094",lon:"-122.466031"})
db.points.insert({name:"Downtown SF (Powell & Market)",slug:"pwll",lat:"37.785114",lon:"-122.406677"})
db.points.insert({name:"Fishermans Warf (Pier 39)",slug:"warf",lat:"37.808119",lon:"-122.40911"})

});

//Launch crawler
app.get('/launch',function(req,res){
	var rule = new schedule.RecurrenceRule();
	rule.minute = new schedule.Range(0, 60, 15);

	var j = schedule.scheduleJob(rule, function () {
	  // Do something
	  getDataFromUber();
	});
	// res.end();
});

app.get('/point/:slug',function(req,res){
	db.points.find({slug:req.params.slug},function(err,doc){
		res.json(doc);
	})
});

app.get('/prices/all',function(req,res){
	db.prices.find({},function(err,doc){
		res.json(doc);
	})
});

app.get('/prices/:start/:end',function(req,res){
	db.prices.find({start:req.params.start,end:req.params.end},function(err,doc){
		res.json(doc);
	})
});

function getDataFromUber(){
	console.log('called',Date.now());
	

	async.each(routes,function(item){
		console.log(item.start, item.end);
		var data_points=[];
		var url =  "https://api.uber.com/v1/estimates/price"
		url += "?"
		findPointInfo(item.start,function(res){
			console.log(res)
			url += "start_latitude="
		  	url += res.lat;
		  	url += "&start_longitude="+res.lon
		  	findPointInfo(item.end,function(res){
			  	url += "&end_latitude="
			  	url += res.lat;
			  	url += "&end_longitude="+res.lon
			  	url += "&server_token="+config.uber.server_token
			  	console.log("last",url);
			  	callUberAPI(url,item.start,item.end)
			})

			
		})

		
		// console.log("point",findPointInfo(item.start));
		
		// request.get('')
	})
	
}

function callUberAPI(url,start,end){
	console.log("URRRRL",url)
	request(url, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    console.log(body) // Print the google web page
	    db.prices.insert({start:start,end:end,date:moment.utc().format(),prices:JSON.parse(body).prices})
	  }
	})
}

function findPointInfo(slug,callback){
	var result;
	console.log("findPointInfo called")
	db.points.findOne({ slug: slug },function(err,doc){
		console.log("DOC",doc)
		callback(doc);
	});
}

function launchSchedule(){
	var rule = new schedule.RecurrenceRule();
	rule.minute = new schedule.Range(0, 60, 15);

	var j = schedule.scheduleJob(rule, function () {
	  // Do something
	  getDataFromUber();
	});
}


var port = process.env.PORT || 3000;
app.listen(port, function(req,res) {
  console.log("Listening on " + port);

  // var points =[]
  // db.points.findOne({ slug: "sf_airport" }, function(err,doc){
  // 	console.log(doc)
  // 	console.log(err);
  // 	point.push(doc)
  // 	// return doc;
  // })
  // console.log(points)

  // findPointInfo("sf_airport",function(res){
  // 	points.push(res);
  // 	console.log(points);
  // })

  launchSchedule()

});
