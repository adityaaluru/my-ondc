import logger from "firebase-functions/logger";

async function errorHandler(database,err,request){
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

export {errorHandler}