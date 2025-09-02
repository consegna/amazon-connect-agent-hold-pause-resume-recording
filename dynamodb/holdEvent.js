import { PutCommand } from "@aws-sdk/lib-dynamodb";

const TABLENAME = process.env.HoldEventLogTable;

export const holdEvent = {

    async save(eventId, ContactId, State, StateTimestamp, DocClient) {

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

        const response = await DocClient.send(new PutCommand(paramsPut));
        return response;
    }
}
