# Holiday NFT Serverless Lambda

# What is this?

The Happy Holidays Digital greeting card is a fun React and CSS animation that allows you Mint your very own NFT gift, change the time of day and check out a relaxing Happy Holidays Spotify Playlist! The code in this repo is for an AWS Lambda behind the API of the app. [You can get a full overview of the Frontend details on the UI repo.](https://github.com/jeremytmack/holidaynft-ui). It might be a good idea to make this a monorepo in the future.

# Architecture

![Architecture Diagram](https://www.jeremymack.com/appDiagram.png)

## Frontend

### ReactJS

The front-end handles all of the UI interactions, animations and delight. It also orchestrates calls to initialize the MetaMask wallet integration and pull a random NFT Gift (image) from S3 and initiate the minting process by calling the AWS Lambda. [The Frontend UI repo can be found here](https://github.com/jeremytmack/holidaynft-ui).

### MetaMask

The ReactJS app checks for a MetaMask wallet address via the "ethereum" method accessible from the global window object (window.ethereum) thanks to the MetaMask plugin (when it's installed).

---

## Backend

### AWS: Amplify Amplify

The ReactJS app is automatically deployed and served via AWS Amplify. Any changes to the app are deployed upon a successful code merge via the Holiday NFT UI GitHub Repo.

### AWS: Certificate Manager & Route 53

TLS Certificates, DNS resolution and routing are all handled via AWS' Route 53 Service

### AWS: Cloudfront Cloudfront

All requests are pushed through the AWS Cloudfront CDN to assist with speedy response times!

### AWS: API Gateway & Lambda API Gateway & Lambda

The dedicated API used for the Holiday NFT app is delivered by way of a serverless function (AWS Lambda) which is exposed and controlled through the AWS API Gateway. All calls to mint and issue NFTs by way of the NFT Port API flow through this gateway and Lambda config. Once the wallet ID is confirmed valid, the digital asset (the cute image) is moved from a temporary S3 home to a permanent S3 home. Once that process is complete, the NFT is minted and delivered to the Wallet Address the user provided by way of linking MetaMask.

### AWS: S3 & DynamoDB S3 & DynamoDB

All digital assetts are stored in S3 for safekeeping. There's a bucket of a finite number of images in available. Once they're gone, no more NFT's can be created. (That, and my free NFTPort trial will have been maxed out)

### NFT Port NFTPort

The service that handles accepting the Wallet ID, digital asset address and description, and ultimately mints the NFT and returns the transaction ID to the Lambda (which in turn returns the success response and transaction ID to the UI for display)

### Polygon (MATIC) ChainPolygon

All NFT's generated through this app are minted on the Polygon Level-2 blockchain. Why? Because it's free! ;)

# How to deploy to Lambda

I'd explain this in detail, but Amazon has this covered. [Here are the official docs on how to deploy a Lambda on AWS](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html)
