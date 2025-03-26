const core = require('@actions/core');
const fetch = require('node-fetch');

async function run() {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    console.log(`githubToken ${githubToken}`)
    const lambdaEndpoint = core.getInput('lambda-endpoint', { required: true });

    const context = require('@actions/github').context;
    const { pull_request } = context.payload;

    if (!pull_request) {
      core.setFailed('No pull request found in the event payload.');
      return;
    }

    const payload = {
      action: 'opened',
      pull_request: pull_request,
      installation: {
        id: context.payload.installation?.id,
      },
      repository: {
        owner: { id: context.payload.repository?.owner?.id },
      },
      githubToken: githubToken, // Include in payload (optional if using headers)
    };

    const signature = 'sha256=' + require('crypto')
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'givfog-Mugmu1-hetdax')
      .update(JSON.stringify(payload))
      .digest('hex');

    const response = await fetch(lambdaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
        'Authorization': `Bearer ${githubToken}`, // Token in headers
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