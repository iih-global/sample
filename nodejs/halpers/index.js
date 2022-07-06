require('dotenv').config();
var encryptor = require('simple-encryptor')(process.env.ECRP_PRIVATE_KEY);
const cfsign = require('aws-cloudfront-sign');
const axios = require('axios');
const urlencode = require('urlencode');
const crypto = require("crypto");
const algorithm = "aes-256-cbc";
const secretKey = process.env.NEW_ECRP_PRIVATE_KEY;
const secretIV = process.env.NEW_VI_PRIVATE_KEY;

var func = {
  makeEncr: function(text){
    if (!isNaN(text)) {
      text = text.toString();
    }

    const cipher = crypto.createCipheriv(algorithm, secretKey, secretIV);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return encrypted.toString("hex");
  },

  makeDecr: function(content){
    const decipher = crypto.createDecipheriv(algorithm, secretKey, secretIV);
    const decrpyted = Buffer.concat([
      decipher.update(Buffer.from(content, "hex")),
      decipher.final(),
    ]);
    return parseInt(decrpyted);
    // return decrpyted.toString();
  },

  /*makeEncr: function(plainStr){
    let ciphertext = encryptor.encrypt(plainStr);
    ciphertext = this.replaceAll(ciphertext, "+", "myplusemy");
    ciphertext = this.replaceAll(ciphertext, "=", "myequlemy");
    ciphertext = this.replaceAll(ciphertext, "/", "myslashmy");
    return ciphertext;
  },

  makeDecr: function(encStr){
    let dataString = encStr.toString().replace('xMl3Jk', '+' ).replace('Por21Ld', '/').replace('Ml32', '=');

    encStr = this.replaceAll(encStr, "myplusemy", "+");
    encStr = this.replaceAll(encStr, "myequlemy", "=");
    encStr = this.replaceAll(encStr, "myslashmy", "/");

    let rtnStr = encryptor.decrypt(encStr);
    console.log(rtnStr, "rtnStr", "makeDecr");
    return rtnStr;
  },*/

  replaceAll: function(string, search, replace) {
    return string.split(search).join(replace);
  },

  getSignUrlImage: function(msg_image){
      var date = new Date()
      date.setDate(date.getDate() + 1);
      var n = date.getTime();
      
      var signingParams = {
        keypairId: process.env.CF_PUBLIC_KEY,
        privateKeyString: process.env.CF_PRIVATE_KEY,
        expireTime: n
      };
       console.log(msg_image)
       if(msg_image !== null){
        return signedUrl = cfsign.getSignedUrl(
          msg_image,
          signingParams
        );  
       }else{
        return null;
       }
      
  },
  makereplace: function(plainStr){
    let ciphertext = plainStr;
    ciphertext = this.replaceAll(ciphertext, " ", "_");
    ciphertext = this.replaceAll(ciphertext, "+", "_");
    ciphertext = this.replaceAll(ciphertext, "=", "_");
    ciphertext = this.replaceAll(ciphertext, "/", "_");
    return ciphertext;
  },
  /*addClientToMap: function(userName, socketId){
    if (!userSocketIdMap.has(userName)) {
      userSocketIdMap.set(userName, new Set([socketId]));
    } else{
      userSocketIdMap.get(userName).add(socketId);
    }
  }

  removeClientFromMap: function(userName, socketId){
    if (userSocketIdMap.has(userName)) {
      let userSocketIdSet = userSocketIdMap.get(userName);
      userSocketIdSet.delete(socketId);
      //if there are no clients for a user, remove that user from online
      //list (map)
      if (userSocketIdSet.size ==0 ) {
        userSocketIdMap.delete(userName);
      }
    }
  },

  updateLiveUsers: function(){
      let keys = Array.from(userSocketIdMap.keys() );
      console.log(userSocketIdMap, "updateLiveUsers", keys);
      io.sockets.emit('live_users', keys);
  }*/

  shortUrlFunction: function(longUrl){
      longUrlQuery = urlencode(longUrl)
      return axios.get(`https://cutt.ly/api/api.php?key=${process.env.CUTTLY_KEY}&userDomain=1&short=${longUrlQuery}`)
      .then(response => {
        return response.data.url.shortLink;
      })
      .catch(error => {
      });
  },

  applicationDaysActiveFunction: function(createdAt, dayApplicationClose){
    if (createdAt !== '') {
      const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
      const secondDate = new Date(createdAt);
      // secondDate.setDate(secondDate.getDate() + dayApplicationClose);
      secondDate.setDate(
        secondDate.getDate() + dayApplicationClose
      );
      let jobCloseDate = secondDate;
      const diffDays = Math.round(Math.abs((new Date() - secondDate) / oneDay));
      if (jobCloseDate >= new Date()) {
        return `${diffDays} Days Active`;
      } else {
        return '0 Day Active';    
      }
    }
    return '0 Day Active';
  },

  capitalizeFirstLetter: function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
module.exports = func;