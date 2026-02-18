//import {useNav} from '@slidev/client';
import {CodeRunnerContext, CodeRunnerOutput, CodeRunnerProviders, defineCodeRunnersSetup} from '@slidev/types';
import {ref} from 'vue';
import { buildUrl } from 'build-url-ts';

//qimport packageJson from "../package.json";
import axios from 'axios';
import {v4 as uuidv4} from 'uuid';

// The token is written on stdout when you start jupyter notebook
const TOKEN = '70136df5e9c0263670b2330329006ef0cb0478824330ab95';
const BASE_URL = 'http://localhost:8888';
const HEADERS = {
    'Authorization': `Token ${TOKEN}`
};

interface Kernel {
    id: string;
    name: string;
}

interface Session {
    id: string;
    path: string;
    name: string;
    type: string;
    kernel: Kernel;
}


// A reactive flag that tracks whether code is currently running
const isRunning = ref(false);

function sendExecuteRequest(code: string, sessionId: string) {
    const msgType = 'execute_request';
    const content = {'code': code, 'silent': false};
    const hdr = {
        'msg_id': uuidv4().replace(/-/g, ''),
        'username': 'test',
        'session': sessionId,
        'data': new Date().toISOString(),
        'msg_type': msgType,
        'version': '5.0'
    };

    const msg = {
        'header': hdr,
        'parent_header': hdr,
        'metadata': {},
        'content': content
    };
    return msg;
}

async function executePythonCodeRemotely(code: string, ctx: CodeRunnerContext): Promise<CodeRunnerOutput> {
    try {
        // Check for existing session
        const sessionsUrl = `${BASE_URL}/api/sessions`;
        const sessionsResponse = await axios.get(sessionsUrl, {headers: HEADERS});
        const existingSessions: Session[] = sessionsResponse.data;

        let targetSession = existingSessions.find(s => s.name === 'slidev-session');
        let session: Session;
        let kernel: Kernel;

        if (targetSession) {
            console.log(`Reusing existing session: ${targetSession.id}`);
            session = targetSession;
            kernel = targetSession.kernel;
        } else {
            console.log("Creating new session");
            const kernelsUrl = `${BASE_URL}/api/kernels`;
            // Python: response = requests.post(url,headers=headers)
            // Axios post second argument is data, third is config
            const kernelResponse = await axios.post(kernelsUrl, {}, {headers: HEADERS});
            kernel = kernelResponse.data;

            const data = {
                "id": "fixed id",
                "kernel": {id: kernel.id, name: kernel.name},
                "name": "slidev-session",
                "path": "path",
                "type": "notebook"
            };

            const newSessionResponse = await axios.post(sessionsUrl, data, {headers: HEADERS});
            session = newSessionResponse.data;
        }

        // Execution request/reply is done on websockets channels
        // Native WebSocket usually doesn't support headers in constructor for browsers,
        // but often does in Node.js environments. Standard way for Jupyter is query param.
        //const wsUrl = `ws://localhost:8888/api/kernels/${kernel.id}/channels?token=${TOKEN}`;
        const wsUrl = buildUrl('ws://localhost:8888', {
            path: `api/kernels/${kernel.id}/channels`,
            queryParams: {
                'Authorization': `Token ${TOKEN}`
            }
        })

        // Use global WebSocket
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            const executeRequest = sendExecuteRequest(code, session.id);
            ws.send(JSON.stringify(executeRequest));
        };

        ws.onmessage = (event) => {
            console.log(`Received message: ${JSON.stringify(event.data)}`);
            const data = event.data;
            if (typeof data !== 'string') {
                return;
            }
            const rsp = JSON.parse(data);
            const msgType = rsp.msg_type;

            if (msgType === 'stream') {
                ws.close();
                console.log(`returning ${rsp.content.text}`)
                return {
                    text: rsp.content.text
                };
            }
        };

        ws.onerror = (err) => {
            console.log("WebSocket error");
        };

        ws.onclose = () => {
            console.log('WebSocket closed');
        };
    } catch (error) {
        // Simple error handling like in the python script (which just crashes mostly)
        return {
            error: error
        }
    }
}

// const resp = await fetch(`$CODE_RUNNER_URL/run`, {
//     method: 'POST',
//     headers: {
//         'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//         source: code,
//         options: ctx.options
//     }),
// });
// if (!resp.ok) {
//     return {
//         error: `Python code execution failed: ${resp.statusText}`,
//     }
// }
//
// const data = await resp.text();
// const parser = new DOMParser();
// const doc = parser.parseFromString(data, 'text/html');
// const firstScript = doc.body.getElementsByTagName('python-runner-script')[0];
// if (!firstScript) {
//     return {
//         error: 'Python code execution failed: no output',
//     }
// }

// Create a script element with the content of the first script tag
// const script = doc.createElement('script');
// script.type = 'text/javascript';
// script.innerHTML = firstScript.innerHTML;
//
// return {
//     element: script,
// }
//}

export default defineCodeRunnersSetup((_runners: CodeRunnerProviders) => {
    return {
        python(code, ctx) {
            return executePythonCodeRemotely(code, ctx);
        },
    };
});
