"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDescriptionForSlack = exports.getChangelog = exports.getNewReleaseVersion = void 0;
const github_1 = require("@actions/github");
const getNewReleaseVersion = (lastTag) => {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    let version = 1;
    if (lastTag) {
        let [prevYear, prevMonth, prevVersion] = lastTag.slice(1).split('.').map(Number);
        if (prevYear === year && prevMonth === month) {
            version = prevVersion + 1;
        }
    }
    return `v${year}.${month}.${version}`;
};
exports.getNewReleaseVersion = getNewReleaseVersion;
const getChangelog = (githubToken, pullRequestId, pullRequestRepository) => __awaiter(void 0, void 0, void 0, function* () {
    const octokit = (0, github_1.getOctokit)(githubToken);
    const [repoOwner, repoName] = pullRequestRepository.split('/');
    const comments = yield octokit.rest.issues.listComments({
        owner: repoOwner,
        repo: repoName,
        issue_number: Number(pullRequestId),
    });
    const changelogComment = comments.data.find((comment) => { var _a; return (_a = comment.body) === null || _a === void 0 ? void 0 : _a.includes('<!-- automated-changelog -->'); });
    if (!changelogComment) {
        throw Error('No changelog comment found. Please ensure you have a comment with the text `<!-- automated-changelog -->` in the pull request.');
    }
    const changelog = changelogComment.body.split('```')[1];
    return changelog;
});
exports.getChangelog = getChangelog;
const parseDescriptionForSlack = (description, leonardoJira) => {
    if (!description)
        return '';
    const ticketsLinked = description.replaceAll(/\[.*?\]/g, (match) => {
        const jiraTicket = match.slice(1, -1);
        if (!jiraTicket)
            return match;
        return `[<${leonardoJira}${jiraTicket}|${jiraTicket}>]`;
    });
    const noMarkdown = ticketsLinked.replaceAll(/##.*/g, (match) => {
        return `*${match.slice(2)}*`;
    });
    return noMarkdown;
};
exports.parseDescriptionForSlack = parseDescriptionForSlack;
//# sourceMappingURL=utils.js.map