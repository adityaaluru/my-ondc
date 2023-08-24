import logger from "firebase-functions/logger";
import {MongoClient} from "mongodb";



export class ProductService{

    static mongoUrl = "mongodb+srv://admin:admin@cluster0.g0dipxl.mongodb.net/?retryWrites=true&w=majority";
    static client = new MongoClient(ProductService.mongoUrl);
    
    static database = ProductService.client.db('ondc');
    static async search(request, response){
      const searchTerms = request.body.searchTerms;
      const cityCode = request.body.city;
      const pageSize = request.body.pageSize;
      const pageNo = request.body.pageNo;
      const prevPage = pageNo - 1;

      logger.info("inputs received: ",searchTerms, cityCode, pageSize, pageNo)
       
      const products = ProductService.database.collection('Products')
      const findResults = await products.find({
        name: { $regex: searchTerms, $options: 'i' },
        description: { $regex: searchTerms, $options: 'i' },
        'vendor.cityCode': cityCode 
      }).
//      skip(prevPage*pageSize).
      limit(pageSize).toArray();


      logger.info("result set size: ",findResults.length);
      response.json({pageNo: pageNo, pageSize: pageSize, resultCount: findResults.length,data: findResults})
      } 

}