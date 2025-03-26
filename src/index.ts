import { readFileSync, writeFileSync } from 'node:fs'
import { getInput, setOutput } from '@actions/core'
import { ReviewResponse } from './types.js'
import { getChangelog, getNewReleaseVersion, parseDescriptionForSlack } from './utils.js'
import { sendSlackMessage } from './sendSlackMessage.js'

const pullRequestId = getInput('PULL_REQUEST_ID') || process.env.PULL_REQUEST_ID // This should be passed in from the GitHub Action
const pullRequestRepository = getInput('PULL_REQUEST_REPOSITORY') || process.env.PULL_REQUEST_REPOSITORY // This should be passed in from the GitHub Action
const githubToken = getInput('GITHUB_TOKEN') || process.env.GITHUB_TOKEN // This should be passed in from the GitHub Action
const lastRelease = getInput('LAST_RELEASE_VERSION') || process.env.LAST_RELEASE_VERSION // This should be passed in from the GitHub Action
const reviewsFilePath = getInput('REVIEWS_FILE_PATH') // This should be passed in from the GitHub Action

const mergedEmoji = getInput('RELEASE_EMOJI') || process.env.RELEASE_EMOJI || '🚀'

// 🤖 Basic checks
if (!githubToken)
	throw Error(
		'No github token provided. Please ensure you have passed through the `GITHUB_TOKEN` in the GitHub Action calling this custom action.'
	)
if (!lastRelease)
	throw Error(
		'No last release version provided. Please ensure you have passed through the `RELEASE_VERSION` in the GitHub Action calling this custom action.'
	)
if (!reviewsFilePath)
	throw Error(
		'No reviews file path provided. Please ensure you have passed through the `REVIEWS_FILE_PATH` in the GitHub Action calling this custom action.'
	)
if (!pullRequestId)
	throw Error(
		'No pull request ID provided. Please ensure you have passed through the `PULL_REQUEST_ID` in the GitHub Action calling this custom action.'
	)
if (!pullRequestRepository)
	throw Error(
		'No pull request repository provided. Please ensure you have passed through the `PULL_REQUEST_REPOSITORY` in the GitHub Action calling this custom action.'
	)
if (!mergedEmoji)
	throw console.warn(
		'No release emoji provided. Please ensure you have passed through the `RELEASE_EMOJI` in the GitHub Action calling this custom action.'
	)

const run = async () => {
	console.log('Found the last release: ', lastRelease)

	// Get core information from the pull request
	const changelog = await getChangelog(githubToken, pullRequestId, pullRequestRepository)
	const newReleaseVersion = getNewReleaseVersion(lastRelease)

	console.log('New release version', newReleaseVersion)
	console.log('Changelog:\n', changelog)
	// console.log('Pull request author:', codeAuthor)
	// console.log('Release manager:', releaseManager)

	// Get approvers & review info
	const reviewsFile = readFileSync(reviewsFilePath)
	console.log('Got reviews file. Checking for reviews!')
	const reviews = JSON.parse(reviewsFile.toString()) as ReviewResponse[]
	console.log('Got reviews!', reviews)
	console.log('Checking for approvals ...')
	//const approvers = reviews.filter((review) => review.state === 'APPROVED').map((review) => review.user.login)
	//const approversUnique = [...new Set(approvers)]

	// sendSlackMessage({
	// 	changelog,
	// 	version: newReleaseVersion,
	// 	pullRequestAuthor: codeAuthor,
	// 	releaseManager,
	// 	approvers: approversUnique,
	// 	leonardoJira,
	// 	webhookUrl,
	// 	pullRequestId,
	// 	pullRequestRepository,
	// 	mergedEmoji,
	// })
	// Log the outputs for the next step
	setOutput('version', newReleaseVersion)
	writeFileSync('changelog.md', changelog || '')
	setOutput('changelog_path', 'changelog.md')
}

run()
