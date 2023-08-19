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
import { ItemSearchRequest, OnSearchResponse } from "./models/ondc/search.js";
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
  
  const doc = {
    transactionId: request.body?.context?.transaction_id,
    messageId: request.body?.context?.message_id,
    bppId: request.body?.context?.bpp_id,
    bppUri: request.body?.context?.bpp_uri,
    body: request.body, 
    headers: request.headers};
  logger.info("Received results on onSearch", doc);
  
  const on_search_results = database.collection('on_search_results');
  const result = await on_search_results.insertOne(doc);
  logger.info("Inserted record: ", result.insertedId);

  try{
    const products = (new OnSearchResponse(request.body)).getProducts();
    logger.info("Product count returned: ", products.length)
    const ProductsCollection = database.collection('Products');
    if(products && products.length && products.length>0){
      const productResult = await ProductsCollection.insertMany(products);
      logger.info("Products inserted: ", productResult.insertedCount);
    } else {
      logger.info("No products found!");
    }
  }
  catch(err){
    logger.error("Error received: ",err.name, err.message,err.stack);
    const ErrorsCollection = database.collection('Errors');
    const errDoc = {
      transactionId: request.body?.context?.transaction_id,
      messageId: request.body?.context?.message_id,
      bppId: request.body?.context?.bpp_id,
      bppUri: request.body?.context?.bpp_uri,
      details:{
        name: err.name,
        msg: err.message,
        stack: err.stack
      }};
    const errorResult = await ErrorsCollection.insertOne(errDoc);
    logger.info("Saved error in collection:", errorResult.insertedId);
  }

  response.json({message: "ACK"});
  
});

export {helloWorld,onSearch,search};