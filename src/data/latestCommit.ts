import { execFileSync } from "node:child_process";

export interface LatestCommit {
	date: string;
	url: string;
}

export function getBuildCommit(repositoryUrl: string): LatestCommit | null {
	try {
		const output = execFileSync(
			"git",
			["log", "-1", "--format=%H%n%cI"],
			{
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			},
		).trim();

		const [hash, date] = output.split(/\r?\n/);

		if (!hash || !date || Number.isNaN(new Date(date).getTime())) {
			return null;
		}

		return {
			date,
			url: `${repositoryUrl}/commit/${hash}`,
		};
	} catch {
		return null;
	}
}
