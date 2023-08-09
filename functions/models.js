import { v4 as uuidv4 } from 'uuid';

class BaseRequest{
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
export class ItemSearchRequest extends BaseRequest{
    constructor(searchTerms,city,areaCode=null,gps=null,transactionId=null){
        super();

        //Context object
        this.reqContext.city = city;
        if(transactionId){
            this.reqContext.transaction_id = transactionId;
        } else {
            this.reqContext.transaction_id = uuidv4();
        }
        this.reqContext.message_id = uuidv4();

        //Message object
        this.reqMessage.intent.provider.descriptor.name = searchTerms;
        if(gps){
            this.reqMessage.intent.fulfillment.end.location.gps = gps;
        } else {
            delete this.reqMessage.intent.fulfillment.end.location.gps;
        }
        if(areaCode){
            this.reqMessage.intent.fulfillment.end.location.address.area_code = areaCode;
        } else {
            delete this.reqMessage.intent.fulfillment.end.location.address.area_code;
        }
    }
}

