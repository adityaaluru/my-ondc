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
import { ONDCSearchService } from "./services/search.js";
import { ProductService } from "./services/commerce.js";
import { GraphService } from "./services/graph.js";

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {body: JSON.stringify(request.body), 
    headers: JSON.stringify(request.headers)});
  response.send("Hello from Firebase!");
});

/*** Search Request and Response */

const search = onRequest(ONDCSearchService.search);
const onSearch = onRequest(ONDCSearchService.onSearch);
const productSearch = onRequest(ProductService.search);

const getCategories = onRequest({ cors: true },GraphService.getAllCategories);
const getProducts = onRequest({ cors: true },GraphService.getProducts);
const semanticSearch = onRequest({ cors: true },GraphService.semanticSearchProducts);
const semanticSearchGraph = onRequest({ cors: true },GraphService.semanticSearchProductsGraph);
const rewriteDescription = onRequest({ cors: true },GraphService.rewriteDescription);
const createCollectionNode = onRequest({ cors: true },GraphService.createCollectionNode);
const associateProductsToCollection = onRequest({ cors: true },GraphService.associateProductsToCollection);
const deleteCollectionNode = onRequest({ cors: true },GraphService.deleteCollectionNode);
export {helloWorld,onSearch,search,productSearch,getCategories,getProducts,semanticSearch,semanticSearchGraph,rewriteDescription,createCollectionNode,associateProductsToCollection,deleteCollectionNode};