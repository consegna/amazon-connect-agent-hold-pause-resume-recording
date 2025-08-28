import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLENAME = process.env.HoldEventLogTable;
const DOCCLIENT = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export const holdEvent = {

    async save(eventId, ContactId, State, StateTimestamp) {

        let inputToDb = {
            "eventId": eventId,
            "ContactId": ContactId,
            "State": State,
            "StateTimestamp": StateTimestamp,
            "ttl": Math.floor(Date.now() / 1000) + (60 * 60) * 3 // 3 hours from now
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
