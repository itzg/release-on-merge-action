import * as github from "@actions/github";
import * as core from "@actions/core";
import semver from "semver";

type OctokitInstance = ReturnType<typeof github.getOctokit>;
type RestEndpointMethods = OctokitInstance["rest"];

export default class ReleaseOnMerge {
  octokit:  OctokitInstance;
  context: typeof github.context;
  dryRun: boolean;

  constructor(octokit: OctokitInstance, context: typeof github.context, dryRun: boolean = false) {
    this.octokit = octokit;
    this.context = context;
    this.dryRun = dryRun;
  }

  async run(): Promise<void> {
    try {
      // if current event is a merged PR
      core.debug("Current event is a merged PR");
      if (
        this.context.eventName === "pull_request" &&
        this.context.payload.pull_request?.merged
      ) {
        core.debug("Pull request is merged");

        // check labels on the PR
        core.debug("Checking labels on the PR");
        const labels:string[] = this.context.payload.pull_request?.labels?.map(
            (label: { name: string }) => label.name
        ) ?? [];

        // if any are "release/{type}", where {type} is one of "major", "minor", or "patch"
        const releaseLabel = labels
            .filter((label) => label.startsWith("release/"))
            .at(0);

        if (releaseLabel) {
            core.debug(`Release label found: ${releaseLabel}`);
            const type = releaseLabel.substring("release/".length);
            switch (type) {
              case "major":
              case "minor":
              case "patch":
                break
              default:
                core.debug(`Invalid release type: ${type}`);
                return;
            }

            await this.handleRelease(type as semver.ReleaseType);
        }

      }
    } catch (e) {
      if (e instanceof Error) {
        core.setFailed(e.message);
      } else {
        core.setFailed(String(e));
      }
    }
  }
  githubRest(): RestEndpointMethods {
    return this.octokit.rest;
  }

  private async handleRelease(type: semver.ReleaseType) {
    // locate the most recent release of this repository
    const resp = await this.githubRest().repos.getLatestRelease({
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
    });

    const latestReleaseName = resp.data.name;

    const parsedVersion = semver.parse(latestReleaseName, { loose: true });
    if (!parsedVersion) {
      core.setFailed(`Could not parse semantic version from release name: ${latestReleaseName}`);
      return;
    }

    const incrementedVersion = semver.inc(parsedVersion, type);
    if (!incrementedVersion) {
      core.setFailed(`Failed to increment version: ${parsedVersion.version}`);
      return;
    }

    const prefix = latestReleaseName?.startsWith("v") ? "v" : "";
    const newVersion = `${prefix}${incrementedVersion}`;

    if (this.dryRun) {
      core.info(`Dry run enabled: not creating release for ${newVersion}`);
    } else {
      await this.createRelease(newVersion);
      core.info(`Created release ${newVersion}`);
    }
    core.setOutput("release-version", newVersion);
  }

  private async createRelease(newVersion: string) {
    await this.githubRest().repos.createRelease({
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
      tag_name: newVersion,
      name: newVersion,
      generate_release_notes: true,
    });
  }
}
