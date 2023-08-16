import blake2b from 'blake2b';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

const inputPayload = '{"context":{"domain":"nic2004:52110","country":"IND","city":"*","action":"search","core_version":"1.1.0","bap_id":"ondc-jatah.web.app","bap_uri":"https://ondc-jatah.web.app","transaction_id":"083f2f4b-6869-48af-b4f7-09ad0639b07b","message_id":"a6c69b66-dd3e-4daf-bd29-26568b077416","timestamp":"2023-08-01T11:03:13.160Z","ttl":"P1M"},"message":{"intent":{"provider":{"descriptor":{"name":"books"}},"fulfillment":{"type":"Delivery","end":{"location":{"gps":"12.9236470000001,77.5861180000001","address":{"area_code":"560041"}}}},"payment":{"@ondc/org/buyer_app_finder_fee_type":"percent","@ondc/org/buyer_app_finder_fee_amount":"2"}}}}';

const subscriberId = "ondc-jatah.web.app";
const brId = "710";
const keyPair = {
    public_key: "fpdCarZXGuGTaNOtsoNzQvwSXEpofHGDfNn7+LfZrrw=",
    private_key: "Ew/pm7Hmeb6q0vNghsw+tGgbH0/UdHoOjvwOQVViIc9+l0Jqtlca4ZNo062yg3NC/BJcSmh8cYN82fv4t9muvA=="
}
const expirySeconds = 300;

console.log('Authorization:',signRequest(inputPayload));

function signRequest(payload){

    const currentTime = new Date().getTime();
    const currentTimeUNIX = Math.floor(currentTime/1000);
    const expiryTimeUNIX = currentTimeUNIX+expirySeconds;
    
    //Create payload hash
    var output = new Uint8Array(64)
    var input = Buffer.from(payload,'utf8')
    const utf8Array = blake2b(output.length).update(input).digest();
    var b64String = Buffer.from(utf8Array).toString('base64');

    //Create Signature
    var signRequest = "(created): "+currentTimeUNIX;
    signRequest = signRequest + "\n" + "(expires): "+expiryTimeUNIX;
    signRequest = signRequest + "\n" + "digest: BLAKE-512=";
    signRequest = signRequest + b64String;
    var bPrivateKey = Buffer.from(keyPair.private_key,'base64');
    var signatureUA = ed25519.sign(Buffer.from(signRequest, 'utf8').toString('hex'), bPrivateKey.toString('hex').slice(0,64));
    const signature = Buffer.from(signatureUA).toString('base64')

    //Create AuthHeader
    var authHeader = "Signature keyId=\""+subscriberId+"|"+brId+"|ed25519\",";
    authHeader = authHeader + "algorithm=\"ed25519\",";
    authHeader = authHeader + "created=\""+currentTimeUNIX+"\",";
    authHeader = authHeader + "expires=\""+expiryTimeUNIX+"\",";
    authHeader = authHeader + "headers=\"(created) (expires) digest\",";
    authHeader = authHeader + "signature=\""+signature+"\"";

    return authHeader;
}

export {signRequest};