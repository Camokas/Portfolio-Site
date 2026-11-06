export function repositorySettings(repository = 'Camokas/portfolio') {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid GitHub repository name');
  const [owner, name] = repository.split('/');
  return {
    name,
    url: `https://github.com/${repository}`,
    commitsApi: `https://api.github.com/repos/${repository}/commits?sha=master&per_page=1`,
    base: name.toLowerCase() === `${owner}.github.io`.toLowerCase() ? '/' : `/${name}/`,
  };
}

// GitHub Actions supplies the actual name, including immediately after a rename.
export const siteRepository = repositorySettings(process.env.GITHUB_REPOSITORY || undefined);
