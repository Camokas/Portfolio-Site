interface GitHubCommit {
	html_url?: unknown;
	commit?: {
		author?: {
			date?: unknown;
		} | null;
		committer?: {
			date?: unknown;
		} | null;
	};
}

interface CachedCommit {
	date: string;
	url: string;
	storedAt: number;
}

const CACHE_KEY = "portfolio-latest-commit-v2";
const OLD_CACHE_KEY = "portfolio-latest-commit-v1";
const CACHE_DURATION = 5 * 60 * 1000;

const commitLink = document.querySelector<HTMLAnchorElement>(
	"[data-latest-commit]",
);
const commitTime = document.querySelector<HTMLTimeElement>(
	"[data-latest-commit-date]",
);

function isCachedCommit(value: unknown): value is CachedCommit {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const candidate = value as Partial<CachedCommit>;

	return (
		typeof candidate.date === "string" &&
		typeof candidate.url === "string" &&
		typeof candidate.storedAt === "number"
	);
}

function readCachedCommit(): CachedCommit | null {
	try {
		const storedValue = localStorage.getItem(CACHE_KEY);

		if (!storedValue) {
			return null;
		}

		const parsedValue: unknown = JSON.parse(storedValue);
		return isCachedCommit(parsedValue) ? parsedValue : null;
	} catch {
		return null;
	}
}

function writeCachedCommit(commit: CachedCommit): void {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(commit));
		localStorage.removeItem(OLD_CACHE_KEY);
	} catch {
		// The date still works when browser storage is unavailable.
	}
}

function getRenderedCommit(): CachedCommit | null {
	if (!commitLink || !commitTime || !commitTime.dateTime) {
		return null;
	}

	const date = new Date(commitTime.dateTime);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return {
		date: date.toISOString(),
		url: commitLink.href,
		storedAt: 0,
	};
}

function isNewerThan(candidate: CachedCommit, current: CachedCommit | null): boolean {
	return !current || new Date(candidate.date).getTime() > new Date(current.date).getTime();
}

function showCommit(commit: CachedCommit): void {
	if (!commitLink || !commitTime) {
		return;
	}

	const date = new Date(commit.date);

	if (Number.isNaN(date.getTime())) {
		return;
	}

	const formatter = new Intl.DateTimeFormat(
		document.documentElement.lang || undefined,
		{
			dateStyle: "medium",
			timeStyle: "short",
		},
	);

	commitTime.dateTime = date.toISOString();
	commitTime.textContent = formatter.format(date);
	commitLink.href = commit.url;
	commitLink.title = "Open the latest commit on GitHub";
}

async function fetchLatestCommit(
	apiUrl: string,
	repositoryUrl: string,
): Promise<CachedCommit> {
	const response = await fetch(apiUrl, {
		cache: "no-store",
		headers: {
			Accept: "application/vnd.github+json",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub API request failed: ${response.status}`);
	}

	const payload: unknown = await response.json();

	if (!Array.isArray(payload) || payload.length === 0) {
		throw new Error("GitHub API returned no commits");
	}

	const latestCommit = payload[0] as GitHubCommit;
	const date =
		latestCommit.commit?.committer?.date ??
		latestCommit.commit?.author?.date;

	if (typeof date !== "string") {
		throw new Error("The latest commit has no valid date");
	}

	return {
		date,
		url:
			typeof latestCommit.html_url === "string"
				? latestCommit.html_url
				: repositoryUrl,
		storedAt: Date.now(),
	};
}

async function updateLatestCommit(): Promise<void> {
	if (!commitLink || !commitTime) {
		return;
	}

	const apiUrl = commitLink.dataset.apiUrl;
	const repositoryUrl = commitLink.dataset.repositoryUrl;

	if (!apiUrl || !repositoryUrl) {
		commitTime.textContent = "Unavailable";
		return;
	}

	const renderedCommit = getRenderedCommit();
	const cachedCommit = readCachedCommit();

	if (cachedCommit && isNewerThan(cachedCommit, renderedCommit)) {
		showCommit(cachedCommit);
	}

	const cacheIsFresh =
		cachedCommit && Date.now() - cachedCommit.storedAt < CACHE_DURATION;

	if (cacheIsFresh) {
		return;
	}

	try {
		const latestCommit = await fetchLatestCommit(apiUrl, repositoryUrl);
		writeCachedCommit(latestCommit);

		const visibleCommit = getRenderedCommit();
		if (!visibleCommit || isNewerThan(latestCommit, visibleCommit)) {
			showCommit(latestCommit);
		}
	} catch {
		// Keep the build-time commit visible when GitHub is temporarily unavailable.
	}
}

void updateLatestCommit();
