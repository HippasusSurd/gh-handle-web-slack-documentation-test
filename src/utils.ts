import { getOctokit } from '@actions/github'

export const getNewReleaseVersion = (lastTag: string | undefined) => {
	const date = new Date()
	const year = date.getUTCFullYear()
	const month = date.getUTCMonth() + 1
	let version = 1

	if (lastTag) {
		let [prevYear, prevMonth, prevVersion] = lastTag.slice(1).split('.').map(Number)

		if (prevYear === year && prevMonth === month) {
			version = prevVersion + 1
		}
	}

	return `v${year}.${month}.${version}` // e.g. v2025.3.12
}

export const getChangelog = async (githubToken: string, pullRequestId: string, pullRequestRepository: string) => {
	const octokit = getOctokit(githubToken)

	const [repoOwner, repoName] = pullRequestRepository.split('/')

	const comments = await octokit.rest.issues.listComments({
		owner: repoOwner,
		repo: repoName,
		issue_number: Number(pullRequestId),
	})

	const changelogComment = comments.data.find((comment) => comment.body?.includes('<!-- automated-changelog -->'))

	if (!changelogComment) {
		throw Error(
			'No changelog comment found. Please ensure you have a comment with the text `<!-- automated-changelog -->` in the pull request.'
		)
	}

	const changelog = changelogComment.body.split('```')[1]
	return changelog
}

export const parseDescriptionForSlack = (description: string, leonardoJira: string) => {
	if (!description) return ''
	// Get all the ticket ids which should be in the format [LEO-1234].
	// Searches for all text between square brackets.
	const ticketsLinked = description.replaceAll(/\[.*?\]/g, (match) => {
		const jiraTicket = match.slice(1, -1) // Remove the square brackets
		if (!jiraTicket) return match
		return `[<${leonardoJira}${jiraTicket}|${jiraTicket}>]`
	})

	// Remove the '##' markdown
	const noMarkdown = ticketsLinked.replaceAll(/##.*/g, (match) => {
		return `*${match.slice(2)}*` // Remove the ## and add bold
	})

	return noMarkdown
}
