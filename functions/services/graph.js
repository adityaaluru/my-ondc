import neo4j from "neo4j-driver";
import {int} from "neo4j-driver-core/lib/integer.js";
import logger from "firebase-functions/logger";
import axios from "axios";

export class GraphService { 
    URI = 'neo4j+s://c692095c.databases.neo4j.io'
    USER = 'neo4j'
    PASSWORD = 'S9FZesHQALoOcO0hqIj2t-oZHAtu4DLpVY_NwT7CQzo'
    OPENAI_KEY = 'Bearer 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'
    driver = {}
    resultNodes = {}
    resultEdges = {}

    /** Neo4j Connection handling */
    async openConnection(){
        this.driver = await neo4j.driver(this.URI, neo4j.auth.basic(this.USER, this.PASSWORD))
    }
    async closeConnection(){
        await this.driver.close()
    }

    /** OpenAI Connection handling */
    openaiClient = axios.create({
        baseURL: 'https://api.openai.com/v1/',
        timeout: 60000,
        headers: {'Content-Type': 'application/json',
    'Authorization': this.OPENAI_KEY}
    });
    
    /** OpenAI utility functions */
    async getEmbedding(inputString) {
        let response = {};
        const apiRes = await this.openaiClient.post('/embeddings',{
            input: inputString,
            model: "text-embedding-ada-002"
        })
        if(apiRes.status === 200){
            const data = apiRes.data.data;
            if(data.length>0){
                response.vector = data[0].embedding;
            }
            response.usage = apiRes.data.usage;
        }
        return response;
    }
    async getChatCompletion(promptString,noOfResponses) {
        let response = {};

        let messages = []
        messages.push({role: "user",content: promptString})

        const apiRes = await this.openaiClient.post('/chat/completions',{
            model: "gpt-3.5-turbo",
            max_tokens: 256,
            n: noOfResponses,
            messages:messages
        })
        if(apiRes.status === 200){
            const data = apiRes.data.choices;
            if(data.length>0){
                response.messages = data.flatMap((choice) => {
                    return choice.message?.content
                });
            }
            response.usage = apiRes.data.usage;
        }
        return response;
    }



    /** Graph utility functions */
    transformToRawGraph(){
        const nodes = [];
        const edges = [];
        for(let field in this.resultNodes){
            nodes.push(this.resultNodes[field])
        }
        for(let field in this.resultEdges){
            edges.push(this.resultEdges[field])
        }
        return {
            nodes: nodes,
            edges: edges
        }
    }
    getResultNode(node,additionalProps){
        let nodeType = "";
        if(node.labels.length>0){
            nodeType = node.labels[0];
        }
        return {
            id: node.elementId,
            data: {
                type: nodeType,
                ...node.properties,
                ...additionalProps
            }
        }
    }
    getResultEdge(edge,additionalProps){
        return {
            id: edge.elementId,
            source: edge.startNodeElementId,
            target: edge.endNodeElementId,
            data: {
                type: edge.type,
                ...edge.properties,
                ...additionalProps
            }
        }
    }

    /** Graph query functions */

    //READ ALL CATEGORIES
    async readAllCategories(){
        const { records, summary } = await this.driver.executeQuery(
            'OPTIONAL MATCH (cat:Category)-[bt]-(sc:Category)-[po]-(p:Product) \
            RETURN cat,bt,sc,count(p) as productCount \
            ORDER BY productCount DESC'
        )
        records.forEach((record)=> {
            if(record.get('cat')){
                const catNode = record.get('cat')
                if(!this.resultNodes[catNode.elementId]){
                    this.resultNodes[catNode.elementId] = this.getResultNode(catNode);
                }
            }
            if(record.get('sc')){
                const subCatNode = record.get('sc')
                if(!this.resultNodes[subCatNode.elementId]){
                    this.resultNodes[subCatNode.elementId] = this.getResultNode(subCatNode,{productCount: record.get('productCount').toNumber()});
                }
            }
            if(record.get('bt')){
                const belongsToRel = record.get('bt')
                if(!this.resultEdges[belongsToRel.elementId]){
                    this.resultEdges[belongsToRel.elementId] = this.getResultEdge(belongsToRel);
                }
            }
        })
    }

    async readAllCollections(){
        const { records, summary } = await this.driver.executeQuery(
            'MATCH (col:Collection) \
            OPTIONAL MATCH (col)-[]-(p:Product)\
            RETURN col,count(p) as productCount \
            ORDER BY productCount DESC'
        )
        records.forEach((record)=> {
            if(record.get('col')){
                const colNode = record.get('col')
                if(!this.resultNodes[colNode.elementId]){
                    this.resultNodes[colNode.elementId] = this.getResultNode(colNode,{productCount: record.get('productCount').toNumber()});
                }
            }
        })

    }

    async getCollection(collectionId){
        let colNode = {}
        const { records, summary } = await this.driver.executeQuery(
            'MATCH (col:Collection {id: $collectionId}) \
            RETURN col',
            {collectionId: collectionId}
        )
        records.forEach((record)=> {
            if(record.get('col')){
                colNode = record.get('col')
            }
        })
        return {...colNode.properties};
    }
    async deleteCollection(collectionId){
        const { records, summary } = await this.driver.executeQuery(
            'MATCH (col:Collection {id: $collectionId}) \
            DETACH DELETE col',
            {collectionId: collectionId}
        )
    }
    async readProductForCategory(categoryId,limit){
        const { records, summary } = await this.driver.executeQuery(
            'OPTIONAL MATCH (cat:Category{id: $categoryId})-[bt:BELONGS_TO]-(p:Product) \
            RETURN cat,bt,p LIMIT $limit',
            {categoryId: categoryId,limit: int(limit)}
        )
        records.forEach((record)=> {
            if(record.get('cat')){
                const catNode = record.get('cat')
                if(!this.resultNodes[catNode.elementId]){
                    this.resultNodes[catNode.elementId] = this.getResultNode(catNode);
                }
            }
            if(record.get('p')){
                const prodNode = record.get('p')
                if(!this.resultNodes[prodNode.elementId]){
                    delete prodNode.properties.openai_vector
                    this.resultNodes[prodNode.elementId] = this.getResultNode(prodNode);
                }
            }
            if(record.get('bt')){
                const partOfRel = record.get('bt')
                if(!this.resultEdges[partOfRel.elementId]){
                    this.resultEdges[partOfRel.elementId] = this.getResultEdge(partOfRel);
                }
            }
        })
    }

    async readProductRelations(productId,limit){
        const { records, summary } = await this.driver.executeQuery(
            'MATCH (p:Product{id: $productId}) \
            MATCH (cat:Category)-[bt]-(p)\
            MATCH (col:Collection)-[btcol]-(p)\
            RETURN p,cat,bt,col,btcol LIMIT $limit',
            {productId: productId, limit: int(limit)}
        )
        records.forEach((record)=> {
            if(record.get('p')){
                const prodNode = record.get('p')
                if(!this.resultNodes[prodNode.elementId]){
                    delete prodNode.properties.openai_vector
                    this.resultNodes[prodNode.elementId] = this.getResultNode(prodNode);
                }
            }
            if(record.get('cat')){
                const catNode = record.get('cat')
                if(!this.resultNodes[catNode.elementId]){
                    this.resultNodes[catNode.elementId] = this.getResultNode(catNode);
                }
            }
            if(record.get('col')){
                const colNode = record.get('col')
                if(!this.resultNodes[colNode.elementId]){
                    this.resultNodes[colNode.elementId] = this.getResultNode(colNode);
                }
            }
            if(record.get('bt')){
                const belongsToRel = record.get('bt')
                if(!this.resultEdges[belongsToRel.elementId]){
                    this.resultEdges[belongsToRel.elementId] = this.getResultEdge(belongsToRel);
                }
            }
            if(record.get('btcol')){
                const belongsToRelCol = record.get('btcol')
                if(!this.resultEdges[belongsToRelCol.elementId]){
                    this.resultEdges[belongsToRelCol.elementId] = this.getResultEdge(belongsToRelCol);
                }
            }
        })
    }

    async readProductForCollection(collectionId,limit){
        const { records, summary } = await this.driver.executeQuery(
            'OPTIONAL MATCH (col:Collection{id: $collectionId})-[bt:BELONGS_TO]-(p:Product) \
            RETURN col,bt,p LIMIT $limit',
            {collectionId: collectionId,limit: int(limit)}
        )
        records.forEach((record)=> {
            if(record.get('col')){
                const colNode = record.get('col')
                if(!this.resultNodes[colNode.elementId]){
                    this.resultNodes[colNode.elementId] = this.getResultNode(colNode);
                }
            }
            if(record.get('p')){
                const prodNode = record.get('p')
                if(!this.resultNodes[prodNode.elementId]){
                    delete prodNode.properties.openai_vector
                    this.resultNodes[prodNode.elementId] = this.getResultNode(prodNode);
                }
            }
            if(record.get('bt')){
                const partOfRel = record.get('bt')
                if(!this.resultEdges[partOfRel.elementId]){
                    this.resultEdges[partOfRel.elementId] = this.getResultEdge(partOfRel);
                }
            }
        })
    }
    async createCollectionNode(id, description, parentId){
        if(parentId){
            await this.driver.executeQuery(
                'MERGE (col:Collection {id: $id})\
                MERGE (pcol:Collection {id: $parentId})\
                MERGE (col)-[s:PART_OF]->(pcol)\
                ON CREATE\
                    SET col.description = $description',
                {id: id, description: description, parentId: parentId}
            )
        } else {
            await this.driver.executeQuery(
                'MERGE (col:Collection {id: $id})\
                ON CREATE\
                    SET col.description = $description',
                {id: id, description: description}
            )
        }
    }
    async checkIfCollectionNodeExists(id){
        let result = false;
        const { records, summary } = await this.driver.executeQuery(
            'MATCH (col:Collection {id: $id})\
            RETURN count(*) as productCount',
            {id: id}
        )
        records.forEach((record)=> {
            if(record.get('productCount')){
                const count = record.get('productCount').toNumber()
                if(count > 0){
                    result = true
                }
            }
        })
        return result;
    }

    //SEMANTIC SEARCH ON PRODUCTS
    async semanticQuery(queryVector,resultCount=10) {
        const results = []
        const { records, summary } = await this.driver.executeQuery(
            "CALL db.index.vector.queryNodes('openai_vectors', $resultCount, $queryVector)\
            YIELD node AS product, score\
            RETURN product.id AS id, product.title AS title, product.description as description,score",
            {queryVector: queryVector,
            resultCount: resultCount}
        )
        records.forEach((record)=> {
            const result = {}
            if(record.get('id')){
                result.id = record.get('id')
            }
            if(record.get('title')){
                result.title = record.get('title')
            }
            if(record.get('description')){
                result.description = record.get('description')
            }
            if(record.get('score')){
                result.score = record.get('score')
            }
            results.push(result)
        })
        //console.log("Query results: "+JSON.stringify(resultsCat))
        return results;
    }
    async semanticQueryAddToCollection(collectionId,queryVector,resultCount=10) {
        const results = []
        const { records, summary } = await this.driver.executeQuery(
            "CALL db.index.vector.queryNodes('openai_vectors', $resultCount, $queryVector)\
            YIELD node AS product, score\
            MERGE (p:Product{id: product.id})\
            MERGE (col:Collection{id: $collectionId})\
            MERGE (p)-[bt:BELONGS_TO]->(col)\
            RETURN product.id AS id, product.title AS title, product.description as description,score",
            {queryVector: queryVector,
            resultCount: resultCount,
            collectionId: collectionId}
        )
        records.forEach((record)=> {
            const result = {}
            if(record.get('id')){
                result.id = record.get('id')
            }
            if(record.get('title')){
                result.title = record.get('title')
            }
            if(record.get('description')){
                result.description = record.get('description')
            }
            if(record.get('score')){
                result.score = record.get('score')
            }
            results.push(result)
        })
        //console.log("Query results: "+JSON.stringify(resultsCat))
        return results;
    }

    async semanticQueryGraph(queryVector,resultCount=10) {
        const { records, summary } = await this.driver.executeQuery(
            "CALL db.index.vector.queryNodes('openai_vectors', $resultCount, $queryVector)\
            YIELD node AS product, score\
            OPTIONAL MATCH (cat:Category)-[po]-(sc:Category)-[bt]-(p:Product{id: product.id}) \
            RETURN cat, po, sc, bt, p",
            {queryVector: queryVector,
            resultCount: resultCount}
        )
        records.forEach((record)=> {
            if(record.get('cat')){
                const catNode = record.get('cat')
                if(!this.resultNodes[catNode.elementId]){
                    this.resultNodes[catNode.elementId] = this.getResultNode(catNode);
                }
            }
            if(record.get('sc')){
                const scatNode = record.get('sc')
                if(!this.resultNodes[scatNode.elementId]){
                    this.resultNodes[scatNode.elementId] = this.getResultNode(scatNode);
                }
            }
            if(record.get('p')){
                const prodNode = record.get('p')
                if(!this.resultNodes[prodNode.elementId]){
                    delete prodNode.properties.openai_vector
                    this.resultNodes[prodNode.elementId] = this.getResultNode(prodNode);
                }
            }
            if(record.get('po')){
                const partOfRel = record.get('po')
                if(!this.resultEdges[partOfRel.elementId]){
                    this.resultEdges[partOfRel.elementId] = this.getResultEdge(partOfRel);
                }
            }
            if(record.get('bt')){
                const belongsToRel = record.get('bt')
                if(!this.resultEdges[belongsToRel.elementId]){
                    this.resultEdges[belongsToRel.elementId] = this.getResultEdge(belongsToRel);
                }
            }

        })
    }
    /** HTTP Handler functions */
    static async getAllCategories (request, response){
        const gs = new GraphService();
        try {
            await gs.openConnection();
            await gs.readAllCategories();
            response.status(200).json(gs.transformToRawGraph())
        } catch(err){
            logger.info("Received error: "+err.message)
            logger.info(JSON.stringify(err.stack))
            response.status(500).json({
                errMsg: err.message,
                errStack: JSON.stringify(err.stack)
            })
        }
        finally{
            await gs.closeConnection()
        }
    }
    static async getAllCollections (request, response){
        const gs = new GraphService();
        try {
            await gs.openConnection();
            await gs.readAllCollections();
            response.status(200).json(gs.transformToRawGraph())
        } catch(err){
            logger.info("Received error: "+err.message)
            logger.info(JSON.stringify(err.stack))
            response.status(500).json({
                errMsg: err.message,
                errStack: JSON.stringify(err.stack)
            })
        }
        finally{
            await gs.closeConnection()
        }
    }
    static async getProducts (request, response){
        const categoryId = request.query?.categoryId;
        const collectionId = request.query?.collectionId;
        let limit = 100;
        if(!categoryId && !collectionId){
            response.status(500).json({message: "Either 'categoryId' or 'collectionId' query parameter is mandatory"})
        }

        if(Number.isInteger(parseInt(request.query.limit))){
            limit = parseInt(request.query.limit);
        }
        const gs = new GraphService();
        try {
            await gs.openConnection();
            if(categoryId){
                await gs.readProductForCategory(categoryId,limit);
            } else {
                await gs.readProductForCollection(collectionId,limit);
            }
            response.status(200).json(gs.transformToRawGraph())
        } catch(err){
            logger.info("Received error: "+err.message)
            logger.info(JSON.stringify(err.stack))
            response.status(500).json({
                errMsg: err.message,
                errStack: JSON.stringify(err.stack)
            })
        }
        finally{
            await gs.closeConnection()
        }
    }
    static async semanticSearchProducts(request, response){
        const queryString = request.body?.query;
        if(queryString){
            const gs = new GraphService();
            try {
                await gs.openConnection();
                console.log("Getting embeddings for input string - "+queryString)
                const embeddingResponse = await gs.getEmbedding(queryString);
                console.log("Embedding usage: "+JSON.stringify(embeddingResponse?.usage))
    
                const searchResults = await gs.semanticQuery(embeddingResponse.vector)
                console.log("Retrived "+searchResults.length+" results")
    
                response.status(200).json({usage : embeddingResponse.usage, results: searchResults})
            } catch(err){
                logger.info("Received error: "+err.message)
                logger.info(JSON.stringify(err.stack))
                response.status(500).json({
                    errMsg: err.message,
                    errStack: JSON.stringify(err.stack)
                })
            }
            finally{
                await gs.closeConnection()
            }
        } else {
            response.status(200).json({message: "Nothing to search! Send a 'query' property in the request payload"})
        }
    }
    static async semanticSearchProductsGraph(request, response){
        const queryString = request.body?.query;
        if(queryString){
            const gs = new GraphService();
            try {
                await gs.openConnection();
                console.log("Getting embeddings for input string - "+queryString)
                const embeddingResponse = await gs.getEmbedding(queryString);
                console.log("Embedding usage: "+JSON.stringify(embeddingResponse?.usage))
    
                await gs.semanticQueryGraph(embeddingResponse.vector)
                console.log("Retreived nodes")
    
                response.status(200).json({usage : embeddingResponse.usage, results: gs.transformToRawGraph()})
            } catch(err){
                logger.info("Received error: "+err.message)
                logger.info(JSON.stringify(err.stack))
                response.status(500).json({
                    errMsg: err.message,
                    errStack: JSON.stringify(err.stack)
                })
            }
            finally{
                await gs.closeConnection()
            }
        } else {
            response.status(200).json({message: "Nothing to search! Send a 'query' property in the request payload"})
        }
    }
    static async rewriteDescription(request, response){
        const descriptionString = request.body?.description;
        const keywords = request.body?.keywords;
        let noOfResponses = request.body?.noOfResponses;
        if(!noOfResponses || isNaN(noOfResponses)){noOfResponses = 2}
        if(descriptionString && Array.isArray(keywords)){
            let keywordString = "";
            keywords.forEach((keyword)=>{keywordString = `${keywordString},'${keyword}'`});
            const gs = new GraphService();
            try {
                //await gs.openConnection();
                const promptString = `This is a product description '${descriptionString}'. Reword this to inlcude key words - ${keywordString}`
                console.log("Input prompt - "+promptString)
                const completionResponse = await gs.getChatCompletion(promptString,noOfResponses);
                console.log("Embedding usage: "+JSON.stringify(completionResponse?.usage))
    
                response.status(200).json({usage : completionResponse.usage, messages: completionResponse.messages})
            } catch(err){
                logger.info("Received error: "+err.message)
                logger.info(JSON.stringify(err.stack))
                response.status(500).json({
                    errMsg: err.message,
                    errStack: JSON.stringify(err.stack)
                })
            }
            finally{
                //await gs.closeConnection()
            }
        } else {
            response.status(200).json({message: "Nothing to complete! Send a 'description' property and 'keywords' array in the request payload "})
        }
    }
    static async createCollectionNode(request, response){
        const nodeId = request.body?.id;
        const description = request.body?.description;
        const parentId = request.body?.parentId;
        if(nodeId && description){
            const gs = new GraphService();
            try {
                await gs.openConnection();
                if(parentId){
                    if(await gs.checkIfCollectionNodeExists(parentId)){
                        logger.info("Creating node with parent id")
                        await gs.createCollectionNode(nodeId,description,parentId)
                    } else {
                        logger.info("Creating node without parent id, as the parent id does not exist")
                        await gs.createCollectionNode(nodeId,description)
                    }
                } else {
                    logger.info("Creating node without parent id")
                    await gs.createCollectionNode(nodeId,description)
                }
                response.status(200).json({message: "Collection node created!"})
            } catch(err){
                logger.info("Received error: "+err.message)
                logger.info(JSON.stringify(err.stack))
                response.status(500).json({
                    errMsg: err.message,
                    errStack: JSON.stringify(err.stack)
                })
            }
            finally{
                await gs.closeConnection()
            }
        } else {
            response.status(200).json({message: "Mandatory fields missing! Please include 'id' and 'description' properties in the request payload"})
        }
    }
    static async deleteCollectionNode(request, response){
        const nodeId = request.body?.id;
        if(nodeId){
            const gs = new GraphService();
            try {
                await gs.openConnection();
                await gs.deleteCollection(nodeId);
                response.status(200).json({message: "Collection node deleted!"})
            } catch(err){
                logger.info("Received error: "+err.message)
                logger.info(JSON.stringify(err.stack))
                response.status(500).json({
                    errMsg: err.message,
                    errStack: JSON.stringify(err.stack)
                })
            }
            finally{
                await gs.closeConnection()
            }
        } else {
            response.status(200).json({message: "Mandatory fields missing! Please include 'id' property in the request payload"})
        }
    }
    static async associateProductsToCollection(request, response){
        const collectionId = request.body?.collectionId;
        let limit = 10;
        if(request.body?.limit && !isNaN(request.body?.limit)){
            limit = request.body?.limit
        }
        if(collectionId){
            const gs = new GraphService();
            try {
                await gs.openConnection();
                logger.info("Getting collection with Id - "+collectionId)
                const collection = await gs.getCollection(collectionId)
                if(collection?.description){
                    logger.info("Received description for collection - "+collection.description)

                    const embeddingResponse = await gs.getEmbedding(collection.description);
                    logger.info("Collection description embedding usage: "+JSON.stringify(embeddingResponse?.usage))
        
                    const searchResults = await gs.semanticQueryAddToCollection(collectionId,embeddingResponse.vector,limit)
                    console.log("Retrived "+searchResults.length+" results")
        
                    response.status(200).json({usage : embeddingResponse.usage, addedProducts: searchResults})
                } else {
                    logger.info("Did not find description for collection - "+collectionId)
                    response.status(404).json({message: "No description found for given collection id"})
                }
            } catch(err){
                logger.info("Received error: "+err.message)
                logger.info(JSON.stringify(err.stack))
                response.status(500).json({
                    errMsg: err.message,
                    errStack: JSON.stringify(err.stack)
                })
            }
            finally{
                await gs.closeConnection()
            }
        } else {
            response.status(200).json({message: "Missing mandatory parameters! Send a 'collectionId' property in the request payload"})
        }
    }
    static async getProductRelations(request, response){
        const productId = request.query?.id;
        let limit = 100;
        if(!productId){
            response.status(500).json({message: "'id' parameter in request payload is mandatory"})
        }
        if(Number.isInteger(parseInt(request.query.limit))){
            limit = parseInt(request.query.limit)
        }
        const gs = new GraphService();
        try {
            await gs.openConnection();
            await gs.readProductRelations(productId,limit)
            response.status(200).json(gs.transformToRawGraph())
        } catch(err){
            logger.info("Received error: "+err.message)
            logger.info(JSON.stringify(err.stack))
            response.status(500).json({
                errMsg: err.message,
                errStack: JSON.stringify(err.stack)
            })
        }
        finally{
            await gs.closeConnection()
        }
    }
}
