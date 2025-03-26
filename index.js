const core = require('@actions/core');
const fetch = require('node-fetch');

async function run() {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const lambdaEndpoint = core.getInput('lambda-endpoint', { required: true });

    // Get GitHub context (provided by the GitHub Action runtime)
    const context = require('@actions/github').context;
    const { pull_request } = context.payload;

    if (!pull_request) {
      core.setFailed('No pull request found in the event payload.');
      return;
    }

    // Construct the payload to match what your Lambda expects
    const payload = {
      action: 'opened', // Simulate an "opened" event to trigger the review
      pull_request: pull_request,
      installation: {
        id: context.payload.installation?.id,
      },
      repository: {
        owner: { id: context.payload.repository?.owner?.id },
      },
    };

    // Call your Lambda endpoint
    const response = await fetch(lambdaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=' + require('crypto')
          .createHmac('sha256', process.env.WEBHOOK_SECRET || 'givfog-Mugmu1-hetdax')
          .update(JSON.stringify(payload))
          .digest('hex'),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      core.setFailed(`Failed to trigger Grok PR Reviewer: ${response.status} ${errorText}`);
      return;
    }

    const result = await response.json();
    core.info(`Grok PR Reviewer triggered successfully: ${JSON.stringify(result)}`);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();