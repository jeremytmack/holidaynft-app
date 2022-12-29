const express = require("express");
const path = require("path");
const app = express();
const port = parseInt(process.env.PORT) || 8080;
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");
const sdk = require("api")("@nftport/v0#cms930ulbqf71tp");
const NFTPORT_AUTHKEY = "0868c8e9-c7b7-43be-85a9-1de9746ef46a";
const AWS_ACCESSKEY = "AzQdQRiWV3lqXmazQx2pPB5B//S9xd0eBnGpNFGT";
const AWS_KEYID = "AKIA4RQKFH44P7XV5DTD";
const cors = require("cors");

// config aws
AWS.config.update({
  accessKeyId: AWS_KEYID,
  secretAccessKey: AWS_ACCESSKEY,
  region: "us-east-1",
});

const static_path = path.join(__dirname, "");
app.use(express.static(static_path));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  cors({
    origin: "*",
  })
);

// parse application/json
app.use(bodyParser.json());

/* GET LIST OF IMAGES TO DISPLAY FROM s3 */
app.get("/api/getimages", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  listBucketContents("available").then((data) => {
    res.send(JSON.stringify(data));
  });
});

/* MOVE SELECTED IMAGE TO LIVE FOLDER IN BUCKET */
app.post("/api/updateimage/:walletid", (req, res) => {
  let walletAddress = req.params["walletid"];

  res.setHeader("Content-Type", "application/json");
  let imagekey = req.body.image;

  checkForWalletId(walletAddress).then((walletHasBeenUsed) => {
    //test data
    //walletHasBeenUsed = false;

    if (walletHasBeenUsed === false) {
      updateBucket(imagekey, walletAddress)
        .then((nftImageUrl) => {
          const fullImageUrl = `https://holidaynft.s3.amazonaws.com/${nftImageUrl}`;

          mintNft(fullImageUrl, walletAddress)
            .then((nftResp) => {
              res.send(JSON.stringify(nftResp));
            })
            .catch((err) => {
              console.log("NFT CALL ERR!!", err);
              res.send(JSON.stringify(err));
            });
        })
        .catch((err) => {
          console.log("bucket error!" + err);
          res.send(JSON.stringify(err));
        });
    } else {
      res.status(400).send({ error: "User already exists" });
    }
  });
});

/* START SERVER */
app.listen(port, () => {
  console.log(`server is running at ${port}`);
});

/* LIST CONTENT OF AVAILABLE NFTS */
function listBucketContents(folderName) {
  const customPromise = new Promise((resolve, reject) => {
    s3 = new AWS.S3();

    // Create the parameters for calling listObjects
    var bucketParams = {
      Bucket: "holidaynft",
      Prefix: folderName,
    };

    // Call S3 to obtain a list of the objects in the bucket
    s3.listObjects(bucketParams, function (err, data) {
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
        if (itemWalletId.toLowerCase() === walletId.toLowerCase()) {
          walletUsed = true;
          resolve(true);
          break;
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
  const customPromise = new Promise((resolve, reject) => {
    sdk.auth(NFTPORT_AUTHKEY);
    sdk
      .easyMintingUrls({
        chain: "polygon",
        name: "Happy Holidays NFT Just For You!",
        description:
          "A special holiday NFT for you from your friend Jeremy Mack!",
        file_url: imageUrl,
        mint_to_address: walletAddress,
      })
      .then(({ data }) => resolve(data))
      .catch((err) => reject(err));
    /*
    resolve({
      response: "OK",
      chain: "polygon",
      contract_address: "0x55a8dbe6f191b370885d01e30cb7d36d0fa99f16",
      transaction_hash:
        "0x38535636a06706bed3d12073ab7650515d1ab7f2099683ad0e05963ce94ba790",
      transaction_external_url:
        "https://polygonscan.com/tx/0x38535636a06706bed3d12073ab7650515d1ab7f2099683ad0e05963ce94ba790",
      mint_to_address: "0xc410ee4320373300f49c7fc3e607ab7a259b8400",
      name: "Happy Holidays NFT Just For You!",
      description:
        "A special holiday NFT for you from your friend Jeremy Mack!",
    });*/
  });
  return customPromise;
}

/*CHECK IF USER ALREADY MINTED NFT*/
/*
function checkNft(walletAddress) {
  const customPromise = new Promise((resolve, reject) => {
    sdk.auth(NFTPORT_AUTHKEY);
    sdk
      .get_user_minted_nfts_v0_me_mints_get({
        page_number: "1",
        page_size: "50",
      })
      .then(({ data }) => {
        // loop to find if user already created an nft and return true or false!
        let collectionLength = data.minted_nfts.length;
        let matchfound = false;
        for (var i = 0; i < collectionLength; i++) {
          if (
            walletAddress.toLowerCase() ===
            data.minted_nfts[i].mint_to_address.toLowerCase()
          ) {
            matchfound = true;
            break;
          }
        }

        resolve(matchfound);
      }) //resolve(data))
      .catch((err) => reject(err));
  });

  return customPromise;
}
*/
