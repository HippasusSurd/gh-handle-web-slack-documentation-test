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

	let changelog: string | undefined = undefined
	if (changelogComment) {
		changelog = changelogComment.body.split('```')[1]
	} else {
		// for backwards compatibility, try to get the changelog from the description in case the comment is not present
		const pullRequest = await octokit.rest.pulls.get({
			owner: repoOwner,
			repo: repoName,
			pull_number: Number(pullRequestId),
		})

		const description = pullRequest.data.body

		changelog = description
			?.match(/```changelog.*```/gs)
			?.find(Boolean)
			?.slice(12, -3)
	}

	if (!changelog) {
		throw Error(
			'No changelog comment found. Please ensure you have a comment with the text `<!-- automated-changelog -->` and a changlog contained in a code block in the comment'
		)
	}

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
