const bcrypt = require("bcrypt");
const { User } = require('./models');
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
import { Router, Request, Response } from "express";
//import { sendOtp } from '../utils/sendOtp';

import rateLimit from 'express-rate-limit';
const router = Router();


const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; 

//Prevent bruce force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/Register',async(req,res)=>{
    try
    {
      //Requested body 
      const {username,firstName,lastName,email,password,role} = req.body;
      if(!username || !firstName || !lastName || !email || !password || !role)
      {
        return res.status(400).send({error:"Missing required fields"});
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password,salt);
      const user = new User({
        username,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: role || "user"
      });
      const savedUser = await user.save();
      res.status(201).send({user: savedUser})
    }catch(error)
    {
        console.error('Error saving user or creating account',error);
    }
})

router.post('/Login',async(req,res) =>{
  try{

    const {email,password} = req.body;
    const user = await User.findOne({email});
    if(!user)
    {
        res.status(401).send({error: "Invalid Username or Password"});
        return;
    }
    if(user.lockUntil && user.lockUntil > Date.now())
    {
     const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
     res.status(423).send({error: `Account Locked. Try again in ${minutesLeft} minutes.`})
    }
    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if(user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS){
        user.lockUntil = Date.now() + LOCK_TIME;
      }
      await user.save();
      res.status(401).send({error: "Invalid username or password"});
    }
    user.failedLoginAttempts = 0;
    user.lockUntil= null;
    await user.save();
    //JWT token for user
    const token = jwt.sign({
      id: user._id,
      username: user.username,
      role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).send({
      token,
      user:{
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  }catch(error)
  {
   console.error("Could not log the user in",error);
   res.status(500).send({error: "Internal server error"});
  }
});

module.exports = router;