import { v4 as uuidv4 } from 'uuid';
import { BaseRequest, BaseResponse } from './base';

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

export class OnSearchResponse extends BaseResponse{
    fulfillments = [];
    constructor(response){
        super(response);
        this.fulfillments = this.getMessage()?.catalog["bpp/fulfillments"];
    }
}
