const express = require("express")
const app = express();
const port = 5000;
const mongoose = require('mongoose');
const bodyParser = require("body-parser")
const cors = require("cors");
const {OAuth2Client} = require('google-auth-library');
var jwt = require('jsonwebtoken');
require("dotenv").config();
app.use(bodyParser.json())
app.use(cors({
    credentials: true
}));




main().catch(err => console.log(err));

let CustomerName = "";
//mongoose

let ticketNumber = 0;
let Data = [];
async function main() {
    mongoose.connect(process.env.MONGO_DB);
}
const cartSchema = new mongoose.Schema({
    customerName: String,
    address: String,
    item:[{
        name:String,
        price: Number,
        quantity: Number
        }],
    totalBill: Number,
    ticketNumber: Number
});


const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    email_verified: Boolean,
    uid: String
});

const User = mongoose.model('user', userSchema);
const Cart = mongoose.model('Cart', cartSchema);


//google auth and jwt

const jwtSecret = process.env.JWT_SECRET;
const client = new OAuth2Client(process.env.CLIENT_ID_GOOGLE);

async function verifytoken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.CLIENT_ID_GOOGLE
    })

    const payload = ticket.getPayload();
    const userid = payload['sub']

    return payload;
}


//functions

const checkuser = async (user) => {

    let userfound = await User.find({ uid: user.sub});
    console.log(userfound)
    CustomerName = user.name;
    if(userfound.length < 1){
        const NewUser = await new User({
            name: user.name,
            email: user.email,
            email_verified: user.email_verified,
            uid: user.sub
        })
        
        NewUser.save();
        
        return('newuser added');
    }else {return('old user');}
        
    
};
    


const DataGathered = async () => {
    const lastInvoice = await Cart.findOne({}).sort({ ticketNumber: -1 });
    Data = lastInvoice ? [lastInvoice] : [];
    ticketNumber = lastInvoice.ticketNumber + 1;
    
};

DataGathered();


app.post('/api/authGoogle', async (req,res) => {
    let {token} = req.body;
    
    try{
        const user = await verifytoken(token);
        const userStatus = await checkuser(user);
        const jwtToken = jwt.sign({userId:user.sub}, jwtSecret, {expiresIn: '1h'})
        res.status(200).json({ message: 'User authenticated', user, userStatus, token:jwtToken, exp:jwt.decode(jwtToken).exp});
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
});

//http requests

app.post('/', async (req,res) => {
    const NewTicket = await new Cart({
        item: req.body.item,
        totalBill: req.body.totalBill, 
        ticketNumber: ticketNumber,
        customerName: CustomerName,
        address: req.body.address
        
    });
    
    console.log(NewTicket);
    await NewTicket.save();
    DataGathered();
    res.send(req.body);
})

app.get('/', (req,res) => {
    res.send("hello World")
    console.log(Data)
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})