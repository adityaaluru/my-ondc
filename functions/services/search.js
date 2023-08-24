import logger from "firebase-functions/logger";
import { ItemSearchRequest, OnSearchResponse } from "../models/ondc/search.js";
import ONDCClient from "../utils/ondc-client.js";
import {MongoClient} from "mongodb";
import { errorHandler } from "../utils/errors.js";



export class ONDCSearchService{

    static mongoUrl = "mongodb+srv://admin:admin@cluster0.g0dipxl.mongodb.net/?retryWrites=true&w=majority";
    static client = new MongoClient(ONDCSearchService.mongoUrl);
    static database = ONDCSearchService.client.db('ondc');

    static async search(request, response){
  
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
      }

      static async onSearch(request, response){
  
        const doc = {
          transactionId: request.body?.context?.transaction_id,
          messageId: request.body?.context?.message_id,
          bppId: request.body?.context?.bpp_id,
          bppUri: request.body?.context?.bpp_uri,
          body: request.body, 
          headers: request.headers};
        logger.info("Received results on onSearch", doc);
        
        const on_search_results = ONDCSearchService.database.collection('on_search_results');
        const result = await on_search_results.insertOne(doc);
        logger.info("Inserted record: ", result.insertedId);
      
        try{
          const products = (new OnSearchResponse(request.body)).getProducts();
          logger.info("Product count returned: ", products.length)
          const ProductsCollection = ONDCSearchService.database.collection('Products');
          if(products && products.length && products.length>0){
            const productResult = await ProductsCollection.insertMany(products);
            logger.info("Products inserted: ", productResult.insertedCount);
          } else {
            logger.info("No products found!");
          }
        }
        catch(err){
            errorHandler(ONDCSearchService.database,err,request);
        }
        response.json({message: "ACK"});
      } 

}