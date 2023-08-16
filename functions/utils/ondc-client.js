import axios from "axios";
import {signRequest} from "./auth.js";
import logger from "firebase-functions/logger";

export default class ONDCClient{
    env = "STAGE";
    httpClient;
    config = {
        "STAGE": {
            gwHostName: "https://pilot-gateway-1.beckn.nsdl.co.in",
        },
        "PRODUCTION": {
            gwHostName: "https://pilot-gateway-1.beckn.nsdl.co.in",
        }
    }
    constructor(env="STAGE"){
        this.httpClient = axios.create({
            baseURL: this.config[env].gwHostName,
            timeout: 30000,
            transformRequest: [this.signRequest]
          })
    }

    async search(requestPayload){
        var response = {};
        try{
            response = await this.httpClient.post('/search',requestPayload);
        }
        catch(error){
            response.error = error.toJSON();
        }
        return response;
    }

    signRequest(data,headers){
        const miniData = JSON.stringify(data,null,0);
        const signature = signRequest(miniData);

        headers["Authorization"] = signature;
        headers["Content-Type"] = "application/json";

        logger.info("Generated Signature:", signature);
        return miniData;
    }
}