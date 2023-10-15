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
        timeout: 5000,
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
    static async getProducts (request, response){
        const categoryId = request.query?.categoryId;
        let limit = 100;
        if(!categoryId){
            response.status(500).json({message: "'categoryId' query parameter is mandatory"})
        }

        if(Number.isInteger(parseInt(request.query.limit))){
            limit = parseInt(request.query.limit);
        }
        const gs = new GraphService();
        try {
            await gs.openConnection();
            await gs.readProductForCategory(categoryId,limit);
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
}
