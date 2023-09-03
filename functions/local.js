import neo4j from "neo4j-driver";
import {MongoClient} from "mongodb";

//MongoDB
const mongoUrl = "mongodb+srv://admin:admin@cluster0.g0dipxl.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(mongoUrl);
const database = client.db('ondc');
const products = database.collection('Products');

//Neo4j
const URI = 'neo4j+s://2bc08d02.databases.neo4j.io'
const USER = 'neo4j'
const PASSWORD = '57wnpjjQy0TXDlebK7-XvoYcwJRbafAY4bvAIpcxv3E'
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))

//const serverInfo = await driver.getServerInfo()
//console.log(serverInfo)

var limitSize = 100;
var skipSize = 0;

if(process.argv.length>2){
    if(process.argv[2] && !isNaN(process.argv[2])){
        skipSize = parseInt(process.argv[2],10)
    }
    if(process.argv[3] && !isNaN(process.argv[3])){
        limitSize = parseInt(process.argv[3],10)
    }
}
console.log("Going with limitSize: "+limitSize+" and skipSize: "+skipSize)

const transformProduct = (dbProduct) => {
    return {
        vendor: {
            id: dbProduct.vendor?.id,//"IGO_Seller_0003",
            name: dbProduct.vendor?.name,//"IGO_Seller_0003",
            phone: dbProduct.vendor?.contact?.phone,//"9886098860",
            email: dbProduct.vendor?.contact?.email, //"abc@xyz.com"
        },
        product: {
            id: dbProduct.id,//"IGO_Seller_0003|nike_ondc_001",
            name: dbProduct.name, //"Nike Shoe 1",
            description: dbProduct.description,//"nike shoe long desp",
            sellPrice: dbProduct.price?.sellPrice,//200,
            maxSellPrice: dbProduct.price?.maxSellPrice,//260,
            currency: dbProduct.price?.currency,//"INR",
            inventoryAvlbl: dbProduct.inventory?.available,//20
        },
        category: {
            id: dbProduct.category//"RET-12-14"
        },
        bpp: {
            id: dbProduct.vendor?.bpp?.id,//"techondc.hexbit.io",
            name: dbProduct.vendor?.bpp?.name,//"Is Going Online",
            uri:dbProduct.vendor?.bpp?.uri//"https://techondc.hexbit.io/"
        },
        city: {
            id: dbProduct.vendor?.cityCode,//"std:080",
            country: dbProduct.vendor?.countryCode//"IND"
        }
    }
}

const createBPP = async (bpp) => {
    const results = await driver.executeQuery(
        'MERGE (bpp:BProvider {id: $id}) \
         ON CREATE \
         SET bpp.name = $name\
         SET bpp.uri = $uri',
        bpp
    )
}

const createCity = async (city) => {
    const results = await driver.executeQuery(
        'MERGE (c:City {id: $id})\
        ON CREATE \
        SET c.country = $country',
        city
    )
}

const createCategory = async (category) => {
    const results = await driver.executeQuery(
        'MERGE (c:Category {id: $id})',
        category
    )
}

const createVendor = async(vendor,vendorRelations) => {
    const results = await driver.executeQuery(
        'MERGE (v:Vendor {id: $id})\
        ON CREATE \
        SET v.name = $name\
        SET v.phone = $phone\
        SET v.email = $email',
    vendor
    )
    const createVendorBPPRelResults = await driver.executeQuery(
        'MATCH (v:Vendor), (bpp:BProvider)\
        WHERE v.id = $vendorId AND bpp.id = $bppId\
        CREATE (bpp)-[r:HOSTS]->(v)\
        RETURN type(r)',
        vendorRelations
    )

    const createVendorCityRelResults = await driver.executeQuery(
        'MATCH (v:Vendor), (c:City)\
        WHERE v.id = $vendorId AND c.id = $cityId\
        CREATE (v)-[r:IS_LOCATED_IN]->(c)\
        RETURN type(r)',
        vendorRelations
    )
}

const createProduct = async (product,productRelations) => {
    const results = await driver.executeQuery(
        'MERGE (p:Product {id: $id})\
        ON CREATE \
        SET p.name = $name\
        SET p.description = $description\
        SET p.sellPrice = $sellPrice\
        SET p.maxSellPrice = $maxSellPrice\
        SET p.currency = $currency\
        SET p.inventoryAvlbl = $inventoryAvlbl',
    product
    )
    const createProductVendorRelResults = await driver.executeQuery(
        'MATCH (p:Product), (v:Vendor)\
        WHERE p.id = $productId AND v.id = $vendorId\
        CREATE (v)-[r:SELLS]->(p)\
        RETURN type(r)',
        productRelations
    )
    const createProductCategoryRelResults = await driver.executeQuery(
        'MATCH (p:Product), (c:Category)\
        WHERE p.id = $productId AND c.id = $categoryId\
        CREATE (p)-[r:BELONGS_TO]->(c)\
        RETURN type(r)',
        productRelations
    )
}

try {
    const productsFromDB = await products.find({}).skip(skipSize).limit(limitSize).toArray();
    console.log("Received "+productsFromDB.length+" products from MongoDB");
    var i = 1;
    var msg = "Started looping...";

    for(let dbProduct of productsFromDB){
        try{
            console.log("processing record: ",i)
            i = i+1;
            const record = transformProduct(dbProduct);
    
            await createBPP(record.bpp);
            msg = "Created BPP"
            await createCategory(record.category);
            msg = "Created Category"
            await createCity(record.city);
            msg = "Created City"
    
            const vendorId = record.vendor.id;
            const cityId = record.city.id;
            const bppId = record.bpp.id;
            const productId = record.product.id;
            const categoryId = record.category.id;
            await createVendor(record.vendor,{vendorId, cityId, bppId});
            msg = "Created Vendor"
            await createProduct(record.product,{productId,vendorId,categoryId});
            msg = "Created Product"
        }
        catch(err) {
            console.log("Error faced when processing record# "+i+". Error after - "+msg)
            console.log(JSON.stringify(err))
        }
    }
} catch(err){
    console.log(JSON.stringify(err))
}

await driver.close()
await client.close()