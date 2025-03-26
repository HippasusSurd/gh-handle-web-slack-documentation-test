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
exports.sendSlackMessage = void 0;
const utils_1 = require("./utils");
const sendSlackMessage = ({ changelog, version, pullRequestAuthor, releaseManager, approvers, leonardoJira, webhookUrl, pullRequestId, pullRequestRepository, mergedEmoji, }) => __awaiter(void 0, void 0, void 0, function* () {
    const isReleaseManagerAlsoAuthor = releaseManager === pullRequestAuthor;
    const authorSection = `✍ ${pullRequestAuthor}`;
    const releaseMangerSection = `${mergedEmoji} ${releaseManager}`;
    const authorshipAttribution = isReleaseManagerAlsoAuthor ? authorSection : `${authorSection} ${releaseMangerSection}`;
    let reviewText = '❌👀';
    if (approvers.length > 0) {
        reviewText = '✅ ' + approvers.map((approver) => `• ${approver} `).join('');
    }
    const attribution = `${authorshipAttribution} ${reviewText}`;
    const pullRequestLink = `https://github.com/${pullRequestRepository}/pull/${pullRequestId}`;
    fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-type': 'application/json',
        },
        body: JSON.stringify({
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: makeTitle(version),
                        emoji: true,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '_*Attributions [<' + `${pullRequestLink}|#${pullRequestId}` + '>]:*' + attribution + '_',
                    },
                },
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: (0, utils_1.parseDescriptionForSlack)(changelog, leonardoJira),
                    },
                },
            ],
        }),
    });
});
exports.sendSlackMessage = sendSlackMessage;
const makeTitle = (version) => {
    return `Changelog for ${version}`;
};
//# sourceMappingURL=sendSlackMessage.js.map