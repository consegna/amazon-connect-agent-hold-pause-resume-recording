const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb")

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLENAME = process.env.HoldEventLogTable;
const DOCCLIENT = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const holdEvent = {

    async save(eventId, ContactId, State, StateTimestamp) {

        let inputToDb = {
            "eventId": eventId,
            "ContactId": ContactId,
            "State": State,
            "StateTimestamp": StateTimestamp
        }

        var paramsPut = {
            TableName: TABLENAME,
            Item: inputToDb
        };

        console.log("dynamodbEvent saveCaseUpdate paramsPut : ", JSON.stringify(paramsPut));

        const response = await DOCCLIENT.send(new PutCommand(paramsPut));
        return response;
    }
}

module.exports = holdEvent;
