# my-ondc


## Steps to deploy this project on firebase

Deploy the full project
`firebase deploy`

Deploy only the functions in the project
`firebase deploy --only functions`

Deploy only a specific function (search in this example)
`firebase deploy --only functions:search`

Test signature utility locally. This will create a signature.txt file which can be used in the postman as an Authoriztion header value
`node local-es6.js`