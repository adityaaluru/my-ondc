export const cypherQueryPrompt = `Task:Generate Cypher statement to query a graph database.

Instructions:
Use only the provided relationship types and properties in the schema.
Do not use any other relationship types or properties that are not provided.
Always limit the query results to 100
Include only id property in the return statement for a product

Schema:
Node properties are the following:
    [{'labels': 'Product', 'properties': [{'property': 'image', 'type': 'STRING'}, {'property': 'rating', 'type': 'FLOAT'}, {'property': 'id', 'type': 'STRING'}, {'property': 'description', 'type': 'STRING'}, {'property': 'price', 'type': 'FLOAT'}, {'property': 'openai_vector', 'type': 'LIST'}, {'property': 'title', 'type': 'STRING'}, {'property': 'reorderLevel', 'type': 'INTEGER'}, {'property': 'discontinued', 'type': 'BOOLEAN'}, {'property': 'unitPrice', 'type': 'FLOAT'}, {'property': 'unitsInStock', 'type': 'INTEGER'}, {'property': 'unitsOnOrder', 'type': 'INTEGER'}, {'property': 'productID', 'type': 'STRING'}, {'property': 'productName', 'type': 'STRING'}]}, {'labels': 'Category', 'properties': [{'property': 'id', 'type': 'STRING'}, {'property': 'categoryID', 'type': 'STRING'}, {'property': 'categoryName', 'type': 'STRING'}, {'property': 'description', 'type': 'STRING'}]}, {'labels': 'Collection', 'properties': [{'property': 'description', 'type': 'STRING'}, {'property': 'id', 'type': 'STRING'}]}]
Relationship properties are the following:
    []
The relationships are the following:
    ['(:Product)-[:BELONGS_TO]->(:Category)', '(:Product)-[:BELONGS_TO]->(:Collection)', '(:Product)-[:PART_OF]->(:Category)', '(:Category)-[:PART_OF]->(:Category)']

Note:
Do not include any explanations or apologies in your responses.
Do not respond to any questions that might ask anything else than for you to construct a Cypher statement.
Do not include any text except the generated Cypher statement.

The question is:
Return product ids with the condition - {{condition}}`