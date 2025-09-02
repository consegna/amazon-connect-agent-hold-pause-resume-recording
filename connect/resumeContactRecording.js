
import { 
    ResumeContactRecordingCommand 
} from "@aws-sdk/client-connect";

const InstanceARN = process.env.InstanceARN;

export const resumeContactRecording = {

    async process(ContactId, InitialContactId, Client) {
        let arnList = (InstanceARN).split("/");

        const input = {
            'InstanceId': arnList[1],
            'ContactId': ContactId,
            'InitialContactId': InitialContactId
        };

        const command = new ResumeContactRecordingCommand(input);

        console.log('resumeContactRecording input', JSON.stringify(input));

        const response = await Client.send(command);

        console.log("resumeContactRecording response - ", JSON.stringify(response));
    }
}
