import fs from 'fs';
import blake2b from 'blake2b';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

// // INPUTS from reference
//const subscriberId = "example-bap.com";
//const brId = "bap1234";
// const keyPair = {
//     public_key: "awGPjRK6i/Vg/lWr+0xObclVxlwZXvTjWYtlu6NeOHk=",
//     //private_key: "lP3sHA+9gileOkXYJXh4Jg8tK0gEEMbf9yCPnFpbldhrAY+NErqL9WD+Vav7TE5tyVXGXBle9ONZi2W7o144eQ=="
//     private_key: "lP3sHA+9gileOkXYJXh4Jg8tK0gEEMbf9yCPnFpbldhrAY+NErqL9WD+Vav7TE5tyVXGXBle9ONZi2W7o144eQ=="
// }
// const payload = '{"context":{"domain":"nic2004:60212","country":"IND","city":"Kochi","action":"search","core_version":"0.9.1","bap_id":"bap.stayhalo.in","bap_uri":"https://8f9f-49-207-209-131.ngrok.io/protocol/","transaction_id":"e6d9f908-1d26-4ff3-a6d1-3af3d3721054","message_id":"a2fe6d52-9fe4-4d1a-9d0b-dccb8b48522d","timestamp":"2022-01-04T09:17:55.971Z","ttl":"P1M"},"message":{"intent":{"fulfillment":{"start":{"location":{"gps":"10.108768, 76.347517"}},"end":{"location":{"gps":"10.102997, 76.353480"}}}}}}'
// const currentTimeUNIX = 1641287875;
// const expiryTimeUNIX = 1641291475;

// Actual INPUTS
const subscriberId = "ondc-jatah.web.app";
const brId = "710";
const keyPair = {
    public_key: "fpdCarZXGuGTaNOtsoNzQvwSXEpofHGDfNn7+LfZrrw=",
    private_key: "Ew/pm7Hmeb6q0vNghsw+tGgbH0/UdHoOjvwOQVViIc9+l0Jqtlca4ZNo062yg3NC/BJcSmh8cYN82fv4t9muvA=="
}
const payload = '{"context":{"domain":"nic2004:52110","country":"IND","city":"*","action":"search","core_version":"1.1.0","bap_id":"ondc-jatah.web.app","bap_uri":"https://ondc-jatah.web.app","transaction_id":"083f2f4b-6869-48af-b4f7-09ad0639b07b","message_id":"a6c69b66-dd3e-4daf-bd29-26568b077416","timestamp":"2023-08-01T11:03:13.160Z","ttl":"P1M"},"message":{"intent":{"provider":{"descriptor":{"name":"books"}},"fulfillment":{"type":"Delivery","end":{"location":{"gps":"12.9236470000001,77.5861180000001","address":{"area_code":"560041"}}}},"payment":{"@ondc/org/buyer_app_finder_fee_type":"percent","@ondc/org/buyer_app_finder_fee_amount":"2"}}}}';
const currentTime = new Date().getTime();
//const currentTimeUNIX = Math.floor(currentTime/1000);
//const expiryTimeUNIX = currentTimeUNIX+300;
const currentTimeUNIX = 1691486855;
const expiryTimeUNIX = 1691487155;
console.log("created: ",currentTimeUNIX)
console.log("expires: ",expiryTimeUNIX)

// Execution starts

//Create HASH
var output = new Uint8Array(64)
var input = Buffer.from(payload)

const utf8Array = blake2b(output.length).update(input).digest();
var b64String = Buffer.from(utf8Array).toString('base64');
console.log('hash:', b64String)


//Create Signature
var signRequest = "(created): "+currentTimeUNIX;
signRequest = signRequest + "\n" + "(expires): "+expiryTimeUNIX;
signRequest = signRequest + "\n" + "digest: BLAKE-512=";
signRequest = signRequest + b64String;


var bPrivateKey = Buffer.from(keyPair.private_key,'base64');
var signatureUA = ed25519.sign(Buffer.from(signRequest, 'utf8').toString('hex'), bPrivateKey.toString('hex').slice(0,64));
const signature = Buffer.from(signatureUA).toString('base64')
console.log('signature:',signature);

//Signature keyId="example-bap.com|bap1234|ed25519",algorithm="ed25519",created="1641287875",
//expires="1641291475",
//headers="(created) (expires) digest",
//signature="cjbhP0PFyrlSCNszJM1F/YmHDVAWsZqJUPzojnE/7TJU3fJ/rmIlgaUHEr5E0/2PIyf0tpSnWtT6cyNNlpmoAQ=="

//Signature keyId="ondc-jatah.web.app|710|ed25519",algorithm="ed25519",created="1690867993",
//expires="1690871593",
//headers="(created) (expires) digest",
//signature="qHH3748CCbGcXHbu81qleqKhFxjVd2tuMYwUgGTo8oynGmAQ2JJqkNBhR+/ydlyZsyEm9PAwr2SpAZK7gy1+BQ=="

//Create AuthHeader
var authHeader = "Signature keyId=\""+subscriberId+"|"+brId+"|ed25519\",";
authHeader = authHeader + "algorithm=\"ed25519\",";
authHeader = authHeader + "created=\""+currentTimeUNIX+"\",";
authHeader = authHeader + "expires=\""+expiryTimeUNIX+"\",";
authHeader = authHeader + "headers=\"(created) (expires) digest\",";
authHeader = authHeader + "signature=\""+signature+"\"";
console.log('Authorization:',authHeader);


fs.writeFileSync("./signature.txt",authHeader);

