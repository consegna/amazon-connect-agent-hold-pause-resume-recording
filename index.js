
import { constants } from './common/constants.js';
import { holdEvent } from './dynamodb/holdEvent.js';
import { resumeContactRecording } from './connect/resumeContactRecording.js';
import { suspendContactRecording } from './connect/suspendContactRecording.js';

export const handler = async (event) => {
    // console.log("INPUT -  ", JSON.stringify(event));
    let result = {};
    try {
        const records = event.Records;
        console.log('Number of records received: ', records.length);
        // Process each record in the Kinesis event. This is sequential processing, to do parallel processing
        // would need to use Promise.all and map, like follows:
        // await Promise.all(event.Records.map(async (record) => { 
        //      let kinesisData = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString('ascii'));
        //      ... the rest of the processing logic ...
        // }));
        // This is left as sequential for both logging, and also rapid toggling of hold states on a contact
        // could cause out of order processing if done in parallel
        for (let i = 0; i < event.Records.length; i++) {
            let kinesisData = JSON.parse(Buffer.from(event.Records[i].kinesis.data, 'base64').toString('ascii'));

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
                        console.log('Evaluating contact state change - ', JSON.stringify(currContact));
                        // Check for Voice Contacts on Hold
                        if (currContact.Channel === 'VOICE' && currContact.State === constants.CONNECTED_ONHOLD) {
                            console.log('Contact on hold is voice, and is on hold, proceeding');
                            console.log(currContact);
                            await holdEvent.save(kinesisData.EventId, currContact.ContactId, currContact.State, currContact.StateStartTimestamp);

                            console.log('contactId on hold', currContact.ContactId);
                            await suspendContactRecording.process(currContact.ContactId, currContact.InitialContactId);
                        // Check for voice contact that is connected
                        } else if (currContact.Channel === 'VOICE' && currContact.State === constants.CONNECTED) {
                            console.log('Connected contact is voice and is connected, checking if resuming from hold');
                            console.log(currContact);
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

                                        await holdEvent.save(kinesisData.EventId, currContact.ContactId, currContact.State, currContact.StateStartTimestamp);

                                        console.log('contactId resumed from hold', currContact.ContactId);
                                        await resumeContactRecording.process(currContact.ContactId, currContact.InitialContactId);  
                                    } else {
                                        console.log('Contact transition ignored');
                                        continue;
                                    }
                                }
                            } else {
                                console.log('No previous state, skipping');
                                continue;
                            }
                        } else {
                            console.log('Non-relevant event, skipping');
                            continue;
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
