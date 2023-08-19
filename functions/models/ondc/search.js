import { v4 as uuidv4 } from 'uuid';
import { BaseRequest, BaseResponse } from './base.js';

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
    audit = {};
    vendor = {}
    bppProviders = [];
    bppFulfillments = [];

    constructor(response){
        super(response);

        const context = this.getContext();
        const catalog = this.getMessage()?.catalog ;
        const error = this.getMessage()?.catalog ;

        if(catalog){
            const bppDescriptor = catalog["bpp/descriptor"]? catalog["bpp/descriptor"]: {};
            this.bppFulfillments = catalog["bpp/fulfillments"]? catalog["bpp/fulfillments"]: [];
            this.bppProviders = catalog["bpp/providers"]? catalog["bpp/providers"]: [];
    
            const lastUpdatedBy = {}
            lastUpdatedBy.transactionId = context?.transaction_id;
            lastUpdatedBy.messageId = context?.message_id;
            lastUpdatedBy.dateTime = (new Date()).toISOString();
            lastUpdatedBy.action = context?.action
            this.audit.lastUpdateBy = lastUpdatedBy
            this.audit.apiVersion = context?.core_version
            this.vendor.cityCode = context?.city
            this.vendor.countryCode = context?.country
            
            const bpp = {}
            bpp.id = context?.bpp_id
            bpp.uri = context?.bpp_uri
            bpp.name = bppDescriptor?.name
            bpp.images = [bppDescriptor?.symbol]
            this.vendor.bpp = bpp;
        } else {
            if(this.getError()){
                throw new Error(JSON.stringify(this.getError()));
            }
        }
    }

    getProducts(){
        const products = []
        for(let provider of this.bppProviders){

            const vendor = {...this.vendor};
            vendor.id = provider?.id
            vendor.name = provider?.descriptor?.name
            vendor.images = [provider?.descriptor?.symbol]
            if(provider?.fulfillments && Array.isArray(provider?.fulfillments)){
                vendor.contact = provider?.fulfillments[0]?.contact
            }

            for(let item of provider?.items){

                const product = {};
                product.id = vendor.id+"|"+item.id;
                product.name = item.descriptor?.name;
                product.description = item.descriptor?.long_desc;
                product.category = item.category_id;
                product.images = [item.descriptor?.symbol]
                product.images = product.images.concat(item.descriptor?.images)

                const price = {};
                price.sellPrice = item.price?.value
                price.maxSellPrice = item.price?.maximum_value
                price.currency = item.price?.currency
                product.price = price;

                const inventory = {}
                inventory.available = item.quantity?.available?.count;
                inventory.maxPerOrder = item.quantity?.maximum?.count;
                product.inventory = inventory;

                const location = this.getLocationForItem(item.location_id)
                product.vendor = {...vendor,location}

                product.fulfillmentTypes = this.getFulfillmentTypes(item.fulfillment_id)
                product.audit = this.audit;
                product.audit.ttl = provider.ttl;
                products.push(product)
            }
        }
        return products;
    }
    getLocationForItem(locationId){
        const result = {}
        if(this.bppProviders.locations && Array.isArray(this.bppProviders.locations)){
            for(let location of this.bppProviders.locations){
                if(location.id === locationId){
                    result.gps = location.gps;
                    result.address = location.address;
                    break;
                }
            }
        } //TODO: locations is not an array
        return result;
    }
    getFulfillmentTypes(fulfillmentId){
        const result = []
        for(let fulfillment of this.bppFulfillments){
            if(fulfillment.id === fulfillmentId){
                result.push(fulfillment.type)
                break;
            }
        }
        return result;
    }
}
