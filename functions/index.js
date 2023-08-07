/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

var blake2b = require('blake2b');

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {body: JSON.stringify(request.body), 
    headers: JSON.stringify(request.headers)});
  response.send("Hello from Firebase!");
});

exports.onSearch = onRequest(async (request, response) => {
  
  const doc = {body: request.body, headers: request.headers};
  logger.info("Received results on onSearch", doc);
  
  const writeResult = await getFirestore()
      .collection("on_search_results")
      .add(doc);

      // Send back a message that we've successfully written the message
  logger.info("Final result", JSON.stringify(writeResult));
  response.json({message: `Message with ID: ${writeResult.id} added.`});
  
});

exports.search = onRequest(async (request, response) => {
  
  const doc = {body: request.body, headers: request.headers};
  const result = {};
  logger.info("Received search request", doc);

  //Creating a payload hash
  result.reqToHash = request.body.test;

/**
 * Generate UTF-8 byte array from json payload;
Generate Blake2b hash from UTF-8 byte array;
Create base64 encoding of Blake2b hash. This becomes the digest for signing;
Sign the request, using your private signing key, and add the signature to the request authorization heade

 */


response.json(result);



});