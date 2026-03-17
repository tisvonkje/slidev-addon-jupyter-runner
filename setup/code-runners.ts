//import {useNav} from '@slidev/client';
import {CodeRunnerContext, CodeRunnerOutput, CodeRunnerProviders, defineCodeRunnersSetup} from '@slidev/types';
import {ref} from 'vue';
import {buildUrl} from 'build-url-ts';

//qimport packageJson from "../package.json";
import axios from 'axios';
import {v4 as uuidv4} from 'uuid';

// The token is written on stdout when you start jupyter notebook
const TOKEN = '6d14bc192a64d2d07e3a0d7c6a1c878f0f1dc0fc1448d468';
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

// class to handle WebSockets in a synchronous way
class SyncWebSocket {
    url: string
    socket: WebSocket;

    constructor(url : string) {
        this.url = url
    }

    process(code: string, session) : Promise<CodeRunnerOutput> {
        this.socket = new WebSocket(this.url);

        return new Promise((resolve, reject) => {
            if (this.socket && this.socket.readyState !== this.socket.OPEN) {
                this.socket.addEventListener('open', () =>
                {
                    const executeRequest = sendExecuteRequest(code, session.id);
                    this.socket.send(JSON.stringify(executeRequest));
                });
                this.socket.addEventListener('close', () => { });
                this.socket.addEventListener('error', err => reject(err));
                this.socket.addEventListener('message', event =>
                {
                    console.log(`Received message: ${JSON.stringify(event.data)}`);
                    const data = event.data;
                    if (typeof data !== 'string') {
                        return;
                    }
                    const rsp = JSON.parse(data);
                    const msgType = rsp.msg_type;

                    if (msgType === 'stream') {
                        this.socket.close();
                        console.log(`returning ${rsp.content.text}`)
                        resolve({
                            html: '<pre>'+rsp.content.text+'<\pre>'
                        });
                    }
                    if (msgType === "execute_reply") {
                        this.socket.close();
                        console.log(`returning ${rsp.content.status}`)
                        if(typeof rsp.content.evalue!=='undefined')
                        {
                            resolve({
                                text: rsp.content.evalue
                            });
                        } else
                        {
                            resolve({
                                text: rsp.content.status
                            });
                        }
                    }
                });
            } else {
                reject("Could not open websocket connection");
            }
        });
    }
}

//
// The next function takes a code sting and returns a function that takes two function parameters resolve and reject
// and returns a promise
// The caller of this function calls this function for all the markdown monaco runner scripts. The resulting functions
// are called (in parallel) and their resulting promises are waited for
// To introduce synchronous behavior we move all work to the top level function: the function that is
// returned will just return the precalculated values
//
async function executePythonCodeRemotely(code: string, ctx: CodeRunnerContext): Promise<CodeRunnerOutput> {
    var failure : boolean =false;
    var reason : string;
    var result: CodeRunnerOutput | PromiseLike<CodeRunnerOutput>;
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

        const wsUrl = buildUrl('ws://localhost:8888', {
            path: `api/kernels/${kernel.id}/channels`,
            queryParams: {
                'Authorization': `Token ${TOKEN}`, // probably not needed
                'token': `${TOKEN}`
            }
        })

        const ws = new SyncWebSocket(wsUrl);
        result=await ws.process(code,session);
    } catch (error) {
        failure=true;
        reason=error;
    }
    return new Promise<CodeRunnerOutput>(async (resolve, reject) => {
        {
            if(failure)
                reject(reason);
            else
                resolve(result);
        }
    });
}

export default defineCodeRunnersSetup((_runners: CodeRunnerProviders) => {
    return {
        python(code, ctx) {
            return executePythonCodeRemotely(code, ctx);
        },
    };
});
