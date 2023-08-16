export class BaseRequest{
    reqContext = {"domain":"nic2004:52110","country":"IND","city":"*","action":"search","core_version":"1.1.0","bap_id":"ondc-jatah.web.app","bap_uri":"https://ondc-jatah.web.app","transaction_id":"083f2f4b-6869-48af-b4f7-09ad0639b07b","message_id":"a6c69b66-dd3e-4daf-bd29-26568b077416","timestamp":"2023-08-01T11:03:13.160Z","ttl":"P1M"};
    reqMessage = {"intent":{"provider":{"descriptor":{"name":"books"}},"fulfillment":{"type":"Delivery","end":{"location":{"gps":"12.9236470000001,77.5861180000001","address":{"area_code":"560041"}}}},"payment":{"@ondc/org/buyer_app_finder_fee_type":"percent","@ondc/org/buyer_app_finder_fee_amount":"2"}}}

    constructor(){}

    toJSON(){
        return {context: this.reqContext, message: this.reqMessage};
    }
    toString(){
        return JSON.stringify({context: this.reqContext, message: this.reqMessage},null,0);
    }
}

export class BaseResponse{
    res = {};
    resContext = {};
    resMessage = {}
    bppId = 
    bppUri = 

    constructor(response){
        this.res = JSON.parse(response);
        this.resContext = res.context;
        this.resMessage = res.message;
        this.bppId = res.context?.bpp_id;
        this.bppUri = res.context?.bpp_uri;
    }

    getContext(){
        return this.resContext;
    }
    getMessage(){
        return this.resMessage;
    }
}