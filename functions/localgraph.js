import { GraphService } from "./services/graph.js"

const gs = new GraphService();
try {
    await gs.openConnection();
    await gs.readAllCategories();
    console.log("**** RESULTS *****");
    console.log(JSON.stringify(gs.transformToRawGraph()));
} catch(err){
    console.log("Received error: "+err.message)
    console.log(JSON.stringify(err.stack))
}
finally{
    await gs.closeConnection()
}
