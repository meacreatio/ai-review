const core = require('@actions/core');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { NodeHttpHandler } = require('@aws-sdk/node-http-handler');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

async function run() {
  try {
    const lambdaUrl = 'https://auafv7i3xslo4i3iirk3rcgkae0egfja.lambda-url.us-east-1.on.aws/'; // From GrokPrUrl output
    const githubToken = core.getInput('github-token', { required: true });

    core.info('Starting Grok PR Reviewer Action');
    console.log('Requesting URL:', lambdaUrl);

    const context = require('@actions/github').context;
    const { pull_request } = context.payload;

    if (!pull_request) {
      core.setFailed('No pull request found in the event payload.');
      return;
    }

    const payload = {
      action: 'opened',
      pull_request: pull_request,
      repository: { owner: { id: context.payload.repository?.owner?.id } }
    };

    const url = new URL(lambdaUrl);
    const request = new HttpRequest({
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Host': url.hostname,
        'x-gh-token': githubToken,
      },
      body: JSON.stringify(payload),
    });

    const credentials = await defaultProvider()();
    const signer = new SignatureV4({
      credentials,
      region: 'us-east-1',
      service: 'lambda', // Lambda URL service
      sha256: Sha256,
    });

    const signedRequest = await signer.sign(request);
    const client = new NodeHttpHandler();
    const { response } = await client.handle(signedRequest);

    const responseBody = await new Promise((resolve) => {
      let body = '';
      response.body.on('data', (chunk) => (body += chunk));
      response.body.on('end', () => resolve(body));
    });

    core.info(`Lambda response status: ${response.statusCode}`);
    core.info(`Lambda response body: ${responseBody}`);

    if (response.statusCode !== 200) {
      core.setFailed(`Failed to trigger Grok PR Reviewer: ${response.statusCode} ${responseBody}`);
      return;
    }

    const result = JSON.parse(responseBody);
    core.info(`Grok PR Reviewer triggered successfully: ${JSON.stringify(result)}`);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();