
import { 
    ConnectClient, 
    ResumeContactRecordingCommand 
} from "@aws-sdk/client-connect";

const InstanceARN = process.env.InstanceARN;

export const resumeContactRecording = {

    async process(ContactId, InitialContactId) {
        let arnList = (InstanceARN).split("/");

        const input = {
            'InstanceId': arnList[1],
            'ContactId': ContactId,
            'InitialContactId': InitialContactId
        };

        const client = new ConnectClient({ region: process.env.AWS_REGION });
        const command = new ResumeContactRecordingCommand(input);

        console.log('resumeContactRecording input', JSON.stringify(input));

        const response = await client.send(command);

        console.log("resumeContactRecording response - ", JSON.stringify(response));
    }
}
