const 	Cookies = require('cookies'),
	express = require('express'),
	http = require('http'),
	{ Client } = require('pg'),
	bcrypt=require('bcrypt'),
	bodyParser=require('body-parser');

// .env file load
require('dotenv').config();




const client = new Client({
	  host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE
	})
// Connecting DB
client.connect().then(()=>{console.log('database connected')}).catch((err)=>{console.log(err)});

var app = express();

// parse url
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

var keys = [process.env.COOKIEKEY];

app.get('/',(req,res)=>{
var cookies = new Cookies(req,res,{ keys : keys });
var lV = cookies.get('LastVisit',{signed: true});
cookies.set('LastVisit',new Date().toISOString(), {maxAge: 99000,signed: true})
if(!lV){
res.send('Welcome, first time value giver at '+ Date());
}
else{
res.send('Welcome back! at ' + Date())
}
})

app.get('/login',(req,res)=>{

	var cookies = new Cookies(req,res,{ keys : keys });
	// var name = cookies.get('username',{signed:true});
	var lV = cookies.get('LastVisit',{signed: true});
	cookies.set('LastVisit',new Date().toISOString(), {maxAge: 100000,signed: true})
	if(!lV || cookies.get('username',{signed:true})==null ){
		cookies.set('username',req.params.name,{signed:true,maxAge:20000});
		res.send('Welcome for first time, let me login');
	}
	else{
		if(cookies.get('username',{signed:true})!=req.params.name){
			res.send('You are no auth');
		}
		else{
			res.send('Welcome sir again, you were logged in already');
		}
	}
})

app.post('/login',(req,res)=>{
	// console.log(req.body);
	var cookies = new Cookies(req,res,{ keys : keys });
	var loggedIN = cookies.get('logged_in',{signed: true});
	if(loggedIN){
		res.redirect('http://localhost:3000/profile');
		return;
	}
	console.log("LOGIN DETAILS")
	var {uid,password} = req.body;
	console.log(uid);
	console.log(password);
	client.query('SELECT * from userlogin where username=\''+uid+'\'',(err,ans)=>{
		if(err) throw err;
		// console.log(ans.rows[0]['userpassword'])
		if(ans.rows.length > 0){
		result = ans.rows[0];
		storepass=result['userpassword'];
		bcrypt.compare(password, storepass, function(err, result) {
			if(err) throw err;
			if(result === true){
				res.send("ahoy!");
				cookies.set('logged_in',true,{signed:true});
				cookies.set('username',uid,{signed: true});
				console.log("PASS");
				return;
			}
			else{
				res.redirect('http://0.0.0.0:3000/login');
				console.log("FAIL");
				return;
			}
		});}
		else {
			res.redirect('http://0.0.0.0:3000/login');
			console.log("FAIL");
			return;
		}
		// client.end();
	})
})

app.post('/register',(req,res)=>{
	var cookies = new Cookies(req,res,{ keys : keys });
	console.log(req.body);
	var loggedIN = cookies.get('logged_in',{signed: true});
	if(loggedIN){
		console.log('already logged in');
		res.redirect('http://localhost:3000/profile');
		return;
	}
	var {uid,email,name,pass,pass2,stdclass,gender,age} = req.body;

	if(pass !== pass2){
		res.redirect('http://localhost:3000/register');
		console.log('UNEQUAL PASS');
		return;
	}
	client.query("SELECT * from userlogin where username=\'"+uid+"\'",(err,ans)=>{
		if(err) throw err;
		if(ans.rows.length>0){
			console.log("User exists");
			console.log(ans.rows);
			res.redirect('http://localhost:3000/register');
			return;
		}else{
			console.log("generating hash now");
			bcrypt.hash(pass, 10,(err, hash) =>{
				if(err) throw err;
				console.log("Hash generated :- "+hash);
				var qstring = "With pdp as ( INSERT INTO UserDetails(UserName, RealName, Email, Gender, Age, Class) VALUES ('"+uid+"','"+name+"','"+email+"','"+gender+"',"+age+","+stdclass+") RETURNING UserId,UserName) INSERT INTO UserLogin Select *,'"+hash+"' FROM pdp;";
				console.log(qstring);
				client.query(qstring)
				.then((result)=>{
					console.log("User created := " + uid +", "+pass+" ;");
					res.redirect('http://localhost:3000/login');
				})
				.catch((err1)=>{
					throw err1;
				})
			});
		}
	})

})
app.get('/logout',(req,res)=>{
	var cookies = new Cookies(req,res,{ keys : keys });
	cookies.set('logged_in',false,{signed:false});
	res.redirect('http://0.0.0.0:3000/');
	// var lV = cookies.get('LastVisit',{signed:true});
	// if(!lV){
	// 	res.send("no lv");
	// }
	// else{
	// 	if(cookies.get('username',{signed:true})!=""){
	// 		var n = cookies.get('username',{signed:true});
	// 		cookies.set('username',"",{maxAge:0,signed:true})
	// 		res.send('You gone bye '+ n);
	// 	}
	// 	else{
	// 		res.send('no login sorry');
	// 	}
	//
	// }
})

const PORT = process.env.PORT || 5001;

app.listen(PORT, ()=>{console.log(`Listening on PORT ${PORT}`)});
