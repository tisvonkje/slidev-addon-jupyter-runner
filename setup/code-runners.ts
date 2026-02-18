//import {useNav} from '@slidev/client';
import {CodeRunnerContext, CodeRunnerOutput, CodeRunnerProviders, defineCodeRunnersSetup} from '@slidev/types';
import {ref} from 'vue';

//qimport packageJson from "../package.json";


// A reactive flag that tracks whether code is currently running
const isRunning = ref( false );

async function executePythonCodeRemotely(code: string, ctx: CodeRunnerContext): Promise<CodeRunnerOutput> {
    const resp = await fetch(`$CODE_RUNNER_URL/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source: code,
            options: ctx.options
        }),
    });
    if (!resp.ok) {
        return {
            error: `Python code execution failed: ${resp.statusText}`,
        }
    }

    const data = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, 'text/html');
    const firstScript = doc.body.getElementsByTagName('python-runner-script')[0];
    if (!firstScript) {
        return {
            error: 'Python code execution failed: no output',
        }
    }

    // Create a script element with the content of the first script tag
    const script = doc.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = firstScript.innerHTML;

    return {
        element: script,
    }
}

export default defineCodeRunnersSetup( ( _runners: CodeRunnerProviders ) => {
    return {
        python(code, ctx) {
            return executePythonCodeRemotely(code, ctx);
        },
    };
} );
