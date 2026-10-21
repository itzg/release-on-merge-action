import * as core from "@actions/core";
import * as github from "@actions/github";
import ReleaseOnMerge from "./ReleaseOnMerge";

async function run(): Promise<void> {
  try {
    const token = core.getInput("token");
    const dryRunInput = core.getInput("dry-run");
    const dryRun = dryRunInput ? core.getBooleanInput("dry-run") : false;
    const octokit = github.getOctokit(token);

    await new ReleaseOnMerge(
      octokit,
      github.context,
      dryRun
    ).run();
  } catch (e) {
    if (e instanceof Error) {
      core.setFailed(e.message);
    } else {
      core.setFailed(String(e));
    }
  }
}

await run();
