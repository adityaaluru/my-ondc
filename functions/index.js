/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import { ItemSearchRequest } from "./models/search.js";
import ONDCClient from "./utils/ondc-client.js";
import {MongoClient} from "mongodb";

initializeApp();

const mongoUrl = "mongodb+srv://admin:admin@cluster0.g0dipxl.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(mongoUrl);
const database = client.db('ondc');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {body: JSON.stringify(request.body), 
    headers: JSON.stringify(request.headers)});
  response.send("Hello from Firebase!");
});

/*** Search Request and Response */

const search = onRequest(async (request, response) => {
  
  const doc = {body: request.body, headers: request.headers};
  logger.info("Request received:", doc);

  const {itemSearchTerms, city, deliveryLocation, transactionId} = request.body;
  const {areaCode,gps} = deliveryLocation
  const gwRequest = new ItemSearchRequest(itemSearchTerms,city,areaCode,gps,transactionId);
  logger.info("Item Search Request(STRING):", gwRequest.toString());

  const client = new ONDCClient();
  const gwResponse = await client.search(gwRequest.toJSON());
  logger.info("Item Search Response:", gwResponse.status,"|",gwResponse.statusText);

  response.json(gwResponse.data);
});

const onSearch = onRequest(async (request, response) => {
  
  const doc = {body: request.body, headers: request.headers};
  logger.info("Received results on onSearch", doc);
  
  const on_search_results = database.collection('on_search_results');
  const result = await on_search_results.insertOne(doc);

  logger.info("Inserted record: ", result.insertedId);
  response.json({message: "ACK"});
  
});

export {helloWorld,onSearch,search};
