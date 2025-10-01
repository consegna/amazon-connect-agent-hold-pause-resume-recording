
import { constants } from './common/constants.js';
import { holdEvent } from './dynamodb/holdEvent.js';
import { resumeContactRecording } from './connect/resumeContactRecording.js';
import { suspendContactRecording } from './connect/suspendContactRecording.js';

import {
    ConnectClient,
} from "@aws-sdk/client-connect";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const CONNECT_CLIENT = new ConnectClient({ region: REGION });
const DOCCLIENT = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export const handler = async (event) => {
    // console.log("INPUT -  ", JSON.stringify(event));
    let result = {};
    try {
        const records = event.Records;
        console.log('Number of records received: ', records.length);
        // Process each record in the Kinesis event. This is sequential processing, to do parallel processing
        // would need to use Promise.all and map, like follows:
        // await Promise.all(event.Records.map(async (record) => { 
        //      let kinesisData = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString('utf-8'));
        //      ... the rest of the processing logic ...
        // }));
        // This is left as sequential for both logging, and also rapid toggling of hold states on a contact
        // could cause out of order processing if done in parallel
        for (let i = 0; i < event.Records.length; i++) {
            // Decode as UTF-8 as we can have non-ASCII characters, otherwise we get control characters that JSON will error on
            let parsed_data = Buffer.from(event.Records[i].kinesis.data, 'base64').toString('utf-8');
            console.debug("DATA -  ", parsed_data);
            let kinesisData = JSON.parse(parsed_data);

            if (kinesisData.EventType === constants.STATE_CHANGE) {
                console.log(JSON.stringify(kinesisData));
                // Evaluate the current contacts to see if any are on hold. NOTE: This can retrigger a recording pause
                // on a standard state change, the API allows for this so do not need to check previous state
                if (
                    kinesisData.CurrentAgentSnapshot &&
                    kinesisData.CurrentAgentSnapshot.Contacts &&
                    kinesisData.CurrentAgentSnapshot.Contacts.length > 0
                ) {
                    const contacts = kinesisData.CurrentAgentSnapshot.Contacts;
                    for (const currContact of contacts) {
                        console.log('Evaluating state change - ', JSON.stringify(currContact));
                        // Check for Voice Contacts on Hold
                        if (currContact.Channel === 'VOICE' && currContact.State === constants.CONNECTED_ONHOLD) {
                            console.log('Contact on hold is voice, proceeding');
                            try{
                                await holdEvent.save(
                                    kinesisData.EventId,
                                    currContact.ContactId,
                                    currContact.State,
                                    currContact.StateStartTimestamp,
                                    DOCCLIENT
                                );

                                console.log('contactId on hold', currContact.ContactId);
                                await suspendContactRecording.process(currContact.ContactId, currContact.InitialContactId, CONNECT_CLIENT);
                            } catch(err){
                                console.error('Error processing suspend recording event', err);
                            }
                        // Check for voice contact that is connected, and so may need the contact recording resumed
                        // Again, this may be a retrigger that was already resumed, but the API allows this
                        } else if (currContact.Channel === 'VOICE' && currContact.State === constants.CONNECTED) {
                            console.log('Connected contact is voice and is connected, checking if resuming from hold');
                            if (
                                kinesisData.PreviousAgentSnapshot &&
                                kinesisData.PreviousAgentSnapshot.Contacts &&
                                kinesisData.PreviousAgentSnapshot.Contacts.length > 0
                            ) {
                                const prevContacts = kinesisData.PreviousAgentSnapshot.Contacts;
                                for (const prevContact of prevContacts) {
                                    if (
                                        prevContact.Channel === 'VOICE' &&
                                        prevContact.State === constants.CONNECTED_ONHOLD &&
                                        currContact.ContactId === prevContact.ContactId
                                    ) {
                                        console.log('Contact that was on hold was voice, proceeding');
                                        try{
                                            await holdEvent.save(
                                                kinesisData.EventId,
                                                currContact.ContactId,
                                                currContact.State,
                                                currContact.StateStartTimestamp,
                                                DOCCLIENT
                                            );

                                            console.log('contactId resumed from hold', currContact.ContactId);
                                            await resumeContactRecording.process(currContact.ContactId, currContact.InitialContactId, CONNECT_CLIENT);
                                        } catch(err){
                                            console.error('Error processing resume recording event', err);
                                        }
                                    } else {
                                        console.log('Contact transition ignored');
                                    }
                                }
                            } else {
                                console.log('No previous state, skipping');
                            }
                        } else {
                            console.log('Non-relevant event, skipping');
                        }
                    }
                }
            } else {
                console.log('Not a state change event, skipping');
            }
        }
    } catch (error) {
        // Non-terminating error
        console.error('error', error);
    }
    return result;
};
