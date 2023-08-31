import neo4j from "neo4j-driver";

const URI = 'neo4j+s://2bc08d02.databases.neo4j.io'
const USER = 'neo4j'
const PASSWORD = '57wnpjjQy0TXDlebK7-XvoYcwJRbafAY4bvAIpcxv3E'
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))

const serverInfo = await driver.getServerInfo()
console.log(serverInfo)

const getProduct = () => {
    return {
        vendor: {
            id: "IGO_Seller_0003",
            name: "IGO_Seller_0003",
            phone: "9886098860",
            email: "abc@xyz.com"
        },
        product: {
            id: "IGO_Seller_0003|nike_ondc_001",
            name: "Nike Shoe 1",
            description: "nike shoe long desp",
            sellPrice: 200,
            maxSellPrice:260,
            currency:"INR",
            inventoryAvlbl: 20
        },
        category: {
            id: "RET-12-14"
        },
        bpp: {
            id:"techondc.hexbit.io",
            name:"Is Going Online",
            uri:"https://techondc.hexbit.io/"
        },
        city: {
            id: "std:080",
            country: "IND"
        }
    }
}

const createBPP = async (bpp) => {
    const results = await driver.executeQuery(
        'MERGE (bpp:BProvider {id: $id})',
        bpp
    )
    console.log("MERGE BPP Results: "+JSON.stringify(results.summary.counters.updates()))
    if(results.summary.counters.containsUpdates()){
        const results = await driver.executeQuery(
            'MATCH (bpp:BProvider {id: $id})\
            SET bpp.name = $name\
            SET bpp.uri = $uri',
            bpp
        )
    }
}

const createCity = async (city) => {
    const results = await driver.executeQuery(
        'MERGE (c:City {id: $id})',
        city
    )
    console.log("MERGE City Results: "+JSON.stringify(results.summary.counters.updates()))
    if(results.summary.counters.containsUpdates()){
        const results = await driver.executeQuery(
            'MATCH (c:City {id: $id})\
            SET c.country = $country',
            city
        )
    }
}

const createCategory = async (category) => {
    const results = await driver.executeQuery(
        'MERGE (c:Category {id: $id})',
        category
    )
    console.log("MERGE Category Results: "+JSON.stringify(results.summary.counters.updates()))
}

const createVendor = async(vendor,vendorRelations) => {
    const results = await driver.executeQuery(
        'MERGE (v:Vendor {id: $id})',
        vendor
    )
    console.log("MERGE Vendor Results: "+JSON.stringify(results.summary.counters.updates()))
    if(results.summary.counters.containsUpdates()){
        const updateVendorResults = await driver.executeQuery(
            'MATCH (v:Vendor {id: $id})\
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
        console.log("BPP Vendor Relation Results: "+JSON.stringify(createVendorBPPRelResults.summary.counters.updates()))

        const createVendorCityRelResults = await driver.executeQuery(
            'MATCH (v:Vendor), (c:City)\
            WHERE v.id = $vendorId AND c.id = $cityId\
            CREATE (v)-[r:IS_LOCATED_IN]->(c)\
            RETURN type(r)',
            vendorRelations
        )
        console.log("Vendor City Relation Results: "+JSON.stringify(createVendorCityRelResults.summary.counters.updates()))
    }
}

const createProduct = async (product,productRelations) => {
    const results = await driver.executeQuery(
        'MERGE (p:Product {id: $id})',
        product
    )
    console.log("MERGE Product Results: "+JSON.stringify(results.summary.counters.updates()))
    if(results.summary.counters.containsUpdates()){
        const updateVendorResults = await driver.executeQuery(
            'MATCH (p:Product {id: $id})\
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
        console.log("Product Vendor Relation Results: "+JSON.stringify(createProductVendorRelResults.summary.counters.updates()))

        const createProductCategoryRelResults = await driver.executeQuery(
            'MATCH (p:Product), (c:Category)\
            WHERE p.id = $productId AND c.id = $categoryId\
            CREATE (p)-[r:BELONGS_TO]->(c)\
            RETURN type(r)',
            productRelations
        )
        console.log("Product Category Relation Results: "+JSON.stringify(createProductCategoryRelResults.summary.counters.updates()))
    }
}

try {
    const record = getProduct();

    await createBPP(record.bpp);
    await createCategory(record.category);
    await createCity(record.city);

    const vendorId = record.vendor.id;
    const cityId = record.city.id;
    const bppId = record.bpp.id;
    const productId = record.product.id;
    const categoryId = record.category.id;
    await createVendor(record.vendor,{vendorId, cityId, bppId});
    await createProduct(record.product,{productId,vendorId,categoryId});

} catch(err){
    console.log(err.message)
}

await driver.close()


