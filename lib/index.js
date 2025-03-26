"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const openai_1 = __importDefault(require("openai"));
const createPrompt_1 = require("./createPrompt");
const createChangelogComment_1 = require("./createChangelogComment");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '.env') });
async function run() {
    try {
        // Use GitHub Actions inputs with fallback to environment variables
        const token = core.getInput('github-token') ?? '';
        const jiraBaseUrl = (core.getInput('atlassian-base-url') ?? '').replace(/\/$/, '');
        const jiraUser = core.getInput('atlassian-email') ?? '';
        const jiraApiToken = core.getInput('atlassian-secret') ?? '';
        const openaiApiKey = core.getInput('openai-secret') ?? '';
        const context = github.context;
        const prDescription = context.payload.pull_request?.body || '';
        const prTitle = context.payload.pull_request?.title || '';
        const prNumber = context.payload.pull_request?.number ?? 0;
        const repoFullName = context.payload.repository?.full_name || '';
        const runId = context.runId;
        const workflowUrl = `https://github.com/${repoFullName}/actions/runs/${runId}`;
        // Extract Jira ticket key from PR description
        const ticketKeyMatch = prDescription.match(/\[(\w+-\d+)\]:/);
        if (!ticketKeyMatch) {
            core.setFailed('No Jira ticket key found.');
            return;
        }
        const ticketKeyPattern = /^[A-Z]+-\d+$/;
        const ticketKey = ticketKeyMatch
            .reverse() // the ticket key is injected at the end of the PR description
            .find(match => ticketKeyPattern.test(match));
        if (!ticketKey) {
            core.setFailed('No valid Jira ticket key found.');
            return;
        }
        // Fetch Jira ticket details
        const jiraApiUrl = `${jiraBaseUrl}/rest/api/2/issue/${ticketKey}`;
        console.log('Fetching Jira ticket from:', jiraApiUrl);
        const jiraResponse = await (0, node_fetch_1.default)(jiraApiUrl, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${jiraUser}:${jiraApiToken}`).toString('base64'),
                'Accept': 'application/json'
            }
        });
        const jiraData = await jiraResponse.json();
        if (!jiraResponse.ok) {
            throw new Error(`Jira API error: ${jiraResponse.status} - ${JSON.stringify(jiraData)}`);
        }
        if (!jiraData.fields) {
            throw new Error('Unexpected Jira API response format - missing fields property');
        }
        const jiraTitle = jiraData.fields.summary || "";
        const jiraDescription = jiraData.fields.description || "";
        // Compose prompt for LLM
        const prompt = (0, createPrompt_1.createPrompt)(prTitle, prDescription, jiraTitle, jiraDescription);
        const openAiClient = new openai_1.default({
            apiKey: openaiApiKey,
        });
        const openaiData = await openAiClient.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });
        if (!openaiData?.choices?.[0]?.message?.content) {
            throw new Error(`Unexpected OpenAI API response format: ${JSON.stringify(openaiData)}`);
        }
        console.log('OpenAI API request completed');
        const generatedChangelog = openaiData.choices[0].message.content.trim();
        console.log('Generated changelog:', generatedChangelog);
        // Initialize Octokit
        const octokit = github.getOctokit(token);
        console.log('Octokit initialized');
        const [repoOwner, repoName] = repoFullName.split('/');
        // Search for existing changelog comment
        const comments = await octokit.rest.issues.listComments({
            owner: repoOwner,
            repo: repoName,
            issue_number: prNumber,
        });
        const existingComment = comments.data.find(comment => comment.body?.includes('<!-- automated-changelog -->'));
        if (existingComment) {
            // Update existing comment
            await octokit.rest.issues.updateComment({
                owner: repoOwner,
                repo: repoName,
                comment_id: existingComment.id,
                body: (0, createChangelogComment_1.createChangelogComment)(generatedChangelog, workflowUrl)
            });
            core.info(`Updated existing changelog comment for PR #${prNumber}`);
        }
        else {
            // Create new comment if none exists
            await octokit.rest.issues.createComment({
                owner: repoOwner,
                repo: repoName,
                issue_number: prNumber,
                body: (0, createChangelogComment_1.createChangelogComment)(generatedChangelog, workflowUrl)
            });
            core.info(`Created new changelog comment for PR #${prNumber}`);
        }
        core.info(`Changelog operation completed for PR #${prNumber}`);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Action failed: ${error.message}`);
        }
        else {
            core.setFailed('Action failed with unknown error');
        }
    }
}
run();
