
import { SuspendContactRecordingCommand } from "@aws-sdk/client-connect";

const InstanceARN = process.env.InstanceARN;

export const suspendContactRecording = {

    async process(ContactId, InitialContactId, Client) {
        let arnList = (InstanceARN).split("/");

        const input = {
            'InstanceId': arnList[1],
            'ContactId': ContactId,
            'InitialContactId': InitialContactId
        };

        const command = new SuspendContactRecordingCommand(input);

        console.log('suspendContactRecording input', JSON.stringify(input));

        const response = await Client.send(command);

        console.log("suspendContactRecording response - ", JSON.stringify(response));
    }
}
