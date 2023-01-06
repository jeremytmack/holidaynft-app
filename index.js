const path = require("path");
const axios = require("axios");
const port = parseInt(process.env.PORT) || 8080;
const AWS = require("aws-sdk");
const sdk = require("api")("@nftport/v0#cms930ulbqf71tp");
const NFTPORT_AUTHKEY = process.env.NFTPORT_AUTHKEY;
const AWS_ACCESSKEY = process.env.AWS_ACCESSKEY;
const AWS_KEYID = process.env.AWS_KEYID;
const cors = require("cors");

// config aws
AWS.config.update({
  accessKeyId: AWS_KEYID,
  secretAccessKey: AWS_ACCESSKEY,
  region: "us-east-1",
});

// Lambda Handler
exports.handler = async (event, context) => {
  //console.log("ISSUED GET: ", JSON.stringify(event));
  const httpMethod = event.httpMethod;
  let statusCode = 400;
  let body = JSON.stringify({ error: "User Exists" });

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // Required for CORS support to work
    "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
  };

  if (String(httpMethod) === "GET") {
    //  if (method === "GET") {
    await listBucketContents("available")
      .then((data) => {
        statusCode = 200;
        body = JSON.stringify(data);
      })
      .catch((err) => {
        body = JSON.stringify({ error: err });
        statusCode = 400;
      });
  } else if (String(httpMethod) === "POST") {
    const requestJSON = JSON.parse(event.body);
    const imagekey = requestJSON.image;
    const walletAddress = requestJSON.walletId;

    let walletHasBeenUsed = await checkForWalletId(walletAddress).then(
      function (response) {
        return response;
      }
    );

    if (walletHasBeenUsed === false) {
      let fullImageUrl = await updateBucket(imagekey, walletAddress)
        .then((nftImageUrl) => {
          return `https://holidaynft.s3.amazonaws.com/${nftImageUrl}`;
        })
        .catch((err) => {
          return JSON.stringify({ err: err });
        });

      if (fullImageUrl.length !== "") {
        let bodyData = await mintNft(fullImageUrl, walletAddress)
          .then((nftResp) => {
            statusCode = 200;
            body = JSON.stringify(nftResp);
          })
          .catch((err) => {
            statusCode = 400;
            body = JSON.stringify({ error: err });
          });
      } else {
        statusCode = 400;
        body = JSON.stringify({ error: "User Already Exists" });
      }
    } else {
      statusCode = 400;
      body = JSON.stringify({ error: "User Already Exists" });
    }
  }
  return {
    statusCode,
    body,
    headers,
  };
};

/* LIST CONTENT OF AVAILABLE NFTS */
function listBucketContents(folderName) {
  console.log("INSIDE LIST CONTENTS METHOD!!!");
  const customPromise = new Promise((resolve, reject) => {
    s3 = new AWS.S3();

    // Create the parameters for calling listObjects
    var bucketParams = {
      Bucket: "holidaynft",
      Prefix: folderName,
    };
    console.log("INSIDE METHOD PROMISE");
    // Call S3 to obtain a list of the objects in the bucket
    s3.listObjects(bucketParams, function (err, data) {
      console.log("DOING S3 LIST!");
      if (err) {
        console.log("Error", err);
      } else {
        // loop through bucket
        let bucketArray = data.Contents;
        let arrayLength = bucketArray.length;
        let arrayImg = [];
        for (var i = 0; i < arrayLength; i++) {
          let imageValue = bucketArray[i].Key;
          imageValue.includes(".jpg") ? arrayImg.push(imageValue) : null;
        }
        console.log("RETURNING IMAGE ARRAY!!!");
        resolve(arrayImg);
      }
    });
  });
  return customPromise;
}

function checkForWalletId(walletId) {
  const customPromise = new Promise((resolve, reject) => {
    listBucketContents("live").then((data) => {
      let itemCount = data.length;
      let walletUsed = false;
      for (var i = 0; i < itemCount; i++) {
        let imageurl = data[i];
        let endString = imageurl.indexOf(".jpg");
        let itemWalletId = imageurl.substr(8, endString - 8);
        if (itemWalletId === "undefined") {
          resolve(false);
        } else {
          if (itemWalletId.toLowerCase() === walletId.toLowerCase()) {
            walletUsed = true;
            resolve(true);
            break;
          }
        }
      }
      resolve(false);
    });
  });
  return customPromise;
}

/* MOVE IMAGE FROM AVAILABLE TO LIVE FOLDERS IN BUCKET! */
function updateBucket(OLD_KEY, walletId) {
  const customPromise = new Promise((resolve, reject) => {
    var s3 = new AWS.S3();

    var BUCKET_NAME = "holidaynft";
    var NEW_KEY = `livenft/${walletId}.jpg`;

    // Copy the object to a new location
    s3.copyObject({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${OLD_KEY}`,
      Key: NEW_KEY,
    })
      .promise()
      .then(() =>
        // Delete the old object\\\
        s3
          .deleteObject({
            Bucket: BUCKET_NAME,
            Key: OLD_KEY,
          })
          .promise()
          .then(() => resolve(NEW_KEY))
      )
      // Error handling is left up to reader
      .catch((e) => reject("ERROR: " + e));
  });
  return customPromise;
}

/*MINT NFT*/
function mintNft(imageUrl, walletAddress) {
  let body = {
    chain: "polygon",
    name: "A Happy Holidays NFT Just For You!",
    description:
      "A special holiday NFT for you from your friend Jeremy Mack! (jtmack+nft@gmail.com)",
    file_url: imageUrl,
    mint_to_address: walletAddress,
  };
  let headers = {
    headers: {
      Authorization: NFTPORT_AUTHKEY,
      accept: "application/json",
    },
  };

  return axios
    .post("https://api.nftport.xyz/v0/mints/easy/urls", body, headers)
    .then(({ data }) => data)
    .catch((err) => err);
}
