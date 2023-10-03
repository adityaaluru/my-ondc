import neo4j from "neo4j-driver";
import logger from "firebase-functions/logger";
import fs from "fs";

//Neo4j


export class GraphService { 
    URI = 'neo4j+s://c692095c.databases.neo4j.io'
    USER = 'neo4j'
    PASSWORD = 'S9FZesHQALoOcO0hqIj2t-oZHAtu4DLpVY_NwT7CQzo'
    driver = {}
    resultNodes = {}
    resultEdges = {}

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
    async openConnection(){
        this.driver = await neo4j.driver(this.URI, neo4j.auth.basic(this.USER, this.PASSWORD))
    }
    async closeConnection(){
        await this.driver.close()
    }
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
    static async getAllCategories (request, response){
        const gs = new GraphService();
        try {
            await gs.openConnection();
            await gs.readAllCategories();
            response.status(500).json(gs.transformToRawGraph())
        } catch(err){
            logger.info("Received error: "+err.message)
            logger.info(JSON.stringify(err.stack))
            response.json({
                errMsg: err.message,
                errStack: JSON.stringify(err.stack)
            })
        }
        finally{
            await gs.closeConnection()
        }
    }
    static async getProductsForCategory(request, response){
    }
}
