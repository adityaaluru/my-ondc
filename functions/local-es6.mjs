import blake2b from 'blake2b';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

var output = new Uint8Array(64)
var input = Buffer.from('{"context":{"domain":"nic2004:60212","country":"IND","city":"Kochi","action":"search","core_version":"0.9.1","bap_id":"bap.stayhalo.in","bap_uri":"https://8f9f-49-207-209-131.ngrok.io/protocol/","transaction_id":"e6d9f908-1d26-4ff3-a6d1-3af3d3721054","message_id":"a2fe6d52-9fe4-4d1a-9d0b-dccb8b48522d","timestamp":"2022-01-04T09:17:55.971Z","ttl":"P1M"},"message":{"intent":{"fulfillment":{"start":{"location":{"gps":"10.108768, 76.347517"}},"end":{"location":{"gps":"10.102997, 76.353480"}}}}}}')

const utf8Array = blake2b(output.length).update(input).digest();
var b64String = Buffer.from(utf8Array).toString('base64');
console.log('hash:', b64String)

// Signature keyId="ondc-jatah.web.app|710|ed25519",algorithm="ed25519",created="1690867993",expires="1690871593",headers="(created) (expires) digest",signature="qHH3748CCbGcXHbu81qleqKhFxjVd2tuMYwUgGTo8oynGmAQ2JJqkNBhR+/ydlyZsyEm9PAwr2SpAZK7gy1+BQ=="

var signRequest = "(created): 1641287875";
signRequest = signRequest + "\n" + "(expires): 1641291475";
signRequest = signRequest + "\n" + "digest: BLAKE-512=";
signRequest = signRequest + b64String;

const keyPair = {
    public_key: "awGPjRK6i/Vg/lWr+0xObclVxlwZXvTjWYtlu6NeOHk=",
    //private_key: "lP3sHA+9gileOkXYJXh4Jg8tK0gEEMbf9yCPnFpbldhrAY+NErqL9WD+Vav7TE5tyVXGXBle9ONZi2W7o144eQ=="
    private_key: "lP3sHA+9gileOkXYJXh4Jg8tK0gEEMbf9yCPnFpbldhrAY+NErqL9WD+Vav7TE5tyVXGXBle9ONZi2W7o144eQ=="
}

var bPrivateKey = Buffer.from(keyPair.private_key,'base64');
var bPublicKey = Buffer.from(keyPair.public_key,'base64');

var signatureUA = ed25519.sign(Buffer.from(signRequest, 'utf8').toString('hex'), bPrivateKey.toString('hex').slice(0,64));
console.log('signature:',Buffer.from(signatureUA).toString('base64'));


