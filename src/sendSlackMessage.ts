import { parseDescriptionForSlack } from './utils'

type SendSlackMessageProps = {
	changelog: string
	version: string
	pullRequestAuthor: string
	releaseManager: string
	approvers: string[]
	leonardoJira: string
	webhookUrl: string
	pullRequestId: string
	pullRequestRepository: string
	mergedEmoji: string
}

export const sendSlackMessage = async ({
	changelog,
	version,
	pullRequestAuthor,
	releaseManager,
	approvers,
	leonardoJira,
	webhookUrl,
	pullRequestId,
	pullRequestRepository,
	mergedEmoji,
}: SendSlackMessageProps) => {
	// Authorship & Management
	const isReleaseManagerAlsoAuthor = releaseManager === pullRequestAuthor
	const authorSection = `✍ ${pullRequestAuthor}`
	const releaseMangerSection = `${mergedEmoji} ${releaseManager}`
	const authorshipAttribution = isReleaseManagerAlsoAuthor ? authorSection : `${authorSection} ${releaseMangerSection}`

	// Review + Peers
	let reviewText = '❌👀'
	if (approvers.length > 0) {
		reviewText = '✅ ' + approvers.map((approver) => `• ${approver} `).join('')
	}

	const attribution = `${authorshipAttribution} ${reviewText}`

	const pullRequestLink = `https://github.com/${pullRequestRepository}/pull/${pullRequestId}`

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
						type: 'mrkdwn', // Why would slack abbreviate this 😔
						text: parseDescriptionForSlack(changelog, leonardoJira),
					},
				},
			],
		}),
	})
}

const makeTitle = (version: string) => {
	// Format as Changelog for vX.XX.XX (DDth Month YYYY)
	return `Changelog for ${version}`
}
