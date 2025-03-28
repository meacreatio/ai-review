const core = require('@actions/core');

async function run() {
  try {
    const fetch = (await import('node-fetch')).default; // Dynamic import for ESM
    // core.info(`Node-fetch version from require: ${fetch.version || 'unknown'}`);
    // core.info(`Node version: ${process.version}`);

    const githubToken = core.getInput('github-token', { required: true });
    // core.info(`core: ${JSON.stringify(core)}}`);
    const lambdaEndpoint = 'https://auafv7i3xslo4i3iirk3rcgkae0egfja.lambda-url.us-east-1.on.aws/'

    core.info('Starting Grok PR Reviewer Action');

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

    const signature = 'sha256=' + require('crypto')
      .createHmac('sha256', 'something')
      .update(JSON.stringify(payload))
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'x-hub-signature-256': signature,
      'x-gh-token': githubToken,
    };

    // core.info(`Headers being sent: ${JSON.stringify(headers, null, 2)}`);
    // core.info(`Payload being sent: ${JSON.stringify(payload, null, 2)}`);

    const response = await fetch(lambdaEndpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    core.info(`Lambda response status: ${response.status}`);
    const responseText = await response.text();
    core.info(`Lambda response body: ${responseText}`);

    if (!response.ok) {
      core.setFailed(`Failed to trigger Grok PR Reviewer: ${response.status} ${responseText}`);
      return;
    }

    const result = JSON.parse(responseText);
    core.info(`Grok PR Reviewer triggered successfully: ${JSON.stringify(result)}`);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();