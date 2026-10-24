import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";
import ReleaseOnMerge from "../src/ReleaseOnMerge";

vi.mock("@actions/core", () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
}));

describe("ReleaseOnMerge", () => {
  const owner = "test-owner";
  const repo = "test-repo";

  let mockGetLatestRelease: ReturnType<typeof vi.fn>;
  let mockCreateRelease: ReturnType<typeof vi.fn>;
  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetLatestRelease = vi.fn();
    mockCreateRelease = vi.fn();

    mockOctokit = {
      rest: {
        repos: {
          getLatestRelease: mockGetLatestRelease,
          createRelease: mockCreateRelease,
        },
      },
    };
  });

  const createGithubContext = (options: {
    eventName?: string;
    merged?: boolean;
    labels?: { name: string }[];
    sha?: string;
    mergeCommitSha?: string;
  } = {}) => {
    const {
      eventName = "pull_request",
      merged = true,
      labels = [{ name: "release/patch" }],
      sha,
      mergeCommitSha,
    } = options;

    return {
      eventName,
      sha,
      payload: {
        pull_request: {
          merged,
          labels,
          merge_commit_sha: mergeCommitSha,
        } as any,
      },
      repo: {
        owner,
        repo,
      },
    } as unknown as typeof github.context;
  };

  it("should create a patch release when a PR with release/patch is merged", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/patch" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "v1.2.3" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 101 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "v1.2.4",
      name: "v1.2.4",
      generate_release_notes: true,
    });
    expect(core.info).toHaveBeenCalledWith("Created release v1.2.4");
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "v1.2.4");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should create a patch release for a merged pull_request_target event", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request_target",
      merged: true,
      labels: [{ name: "release/patch" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "v1.2.3" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 101 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "v1.2.4",
      name: "v1.2.4",
      generate_release_notes: true,
    });
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "v1.2.4");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should create a patch release without v prefix when previous release has no v prefix", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/patch" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "1.2.3" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 101 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "1.2.4",
      name: "1.2.4",
      generate_release_notes: true,
    });
    expect(core.info).toHaveBeenCalledWith("Created release 1.2.4");
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "1.2.4");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should create a minor release when a PR with release/minor is merged", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/minor" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "1.2.3" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 102 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "1.3.0",
      name: "1.3.0",
      generate_release_notes: true,
    });
    expect(core.info).toHaveBeenCalledWith("Created release 1.3.0");
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "1.3.0");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should create a minor release with v prefix when previous release has v prefix", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/minor" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "v1.2.3" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 102 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "v1.3.0",
      name: "v1.3.0",
      generate_release_notes: true,
    });
    expect(core.info).toHaveBeenCalledWith("Created release v1.3.0");
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "v1.3.0");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should create a major release when a PR with release/major is merged", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/major" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "1.2.3" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 103 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "2.0.0",
      name: "2.0.0",
      generate_release_notes: true,
    });
    expect(core.info).toHaveBeenCalledWith("Created release 2.0.0");
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "2.0.0");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should create a major release with v prefix when previous release has v prefix", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/major" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "v1.2.3" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 103 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "v2.0.0",
      name: "v2.0.0",
      generate_release_notes: true,
    });
    expect(core.info).toHaveBeenCalledWith("Created release v2.0.0");
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "v2.0.0");
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should do nothing if PR is not merged", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: false,
      labels: [{ name: "release/minor" }],
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should do nothing if event is not a supported pull request event", async () => {
    const mockContext = createGithubContext({
      eventName: "push",
      merged: true,
      labels: [{ name: "release/patch" }],
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should do nothing if PR has no release label", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "documentation" }, { name: "enhancement" }],
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should do nothing if release label is invalid type", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/invalid-type" }],
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should fail if latest release name is not valid semver", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/patch" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "invalid-version" },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(
      "Could not parse semantic version from release name: invalid-version"
    );
  });

  it("should fail if getLatestRelease rejects with an error", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/patch" }],
    });

    mockGetLatestRelease.mockRejectedValueOnce(
      new Error("API rate limit exceeded")
    );

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith("API rate limit exceeded");
  });

  it("should fail with string representation when a non-Error is thrown", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/patch" }],
    });

    mockGetLatestRelease.mockRejectedValueOnce("String error message");

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(core.setFailed).toHaveBeenCalledWith("String error message");
  });

  it("should handle undefined labels gracefully", async () => {
    const mockContext = {
      eventName: "pull_request",
      payload: {
        pull_request: {
          merged: true,
          labels: undefined,
        } as any,
      },
      repo: {
        owner,
        repo,
      },
    } as unknown as typeof github.context;

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockGetLatestRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("should use first release label when multiple release labels are present", async () => {
    const mockContext = createGithubContext({
      eventName: "pull_request",
      merged: true,
      labels: [{ name: "release/minor" }, { name: "release/major" }],
    });

    mockGetLatestRelease.mockResolvedValueOnce({
      data: { name: "1.0.0" },
    });
    mockCreateRelease.mockResolvedValueOnce({
      data: { id: 104 },
    });

    const action = new ReleaseOnMerge(mockOctokit, mockContext, false);
    await action.run();

    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner,
      repo,
      tag_name: "1.1.0",
      name: "1.1.0",
      generate_release_notes: true,
    });
    expect(core.setOutput).toHaveBeenCalledWith("release-version", "1.1.0");
  });

  describe("dry-run mode", () => {
    it("should set output but not create a release when dry-run is true for patch release with v prefix", async () => {
      const mockContext = createGithubContext({
        eventName: "pull_request",
        merged: true,
        labels: [{ name: "release/patch" }],
      });

      mockGetLatestRelease.mockResolvedValueOnce({
        data: { name: "v1.2.3" },
      });

      const action = new ReleaseOnMerge(mockOctokit, mockContext, true);
      await action.run();

      expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
      expect(mockCreateRelease).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith("Dry run enabled: not creating release for v1.2.4");
      expect(core.setOutput).toHaveBeenCalledWith("release-version", "v1.2.4");
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it("should set output but not create a release when dry-run is true for patch release without v prefix", async () => {
      const mockContext = createGithubContext({
        eventName: "pull_request",
        merged: true,
        labels: [{ name: "release/patch" }],
      });

      mockGetLatestRelease.mockResolvedValueOnce({
        data: { name: "1.2.3" },
      });

      const action = new ReleaseOnMerge(mockOctokit, mockContext, true);
      await action.run();

      expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
      expect(mockCreateRelease).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith("Dry run enabled: not creating release for 1.2.4");
      expect(core.setOutput).toHaveBeenCalledWith("release-version", "1.2.4");
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it("should set output but not create a release when dry-run is true for minor release", async () => {
      const mockContext = createGithubContext({
        eventName: "pull_request",
        merged: true,
        labels: [{ name: "release/minor" }],
      });

      mockGetLatestRelease.mockResolvedValueOnce({
        data: { name: "1.2.3" },
      });

      const action = new ReleaseOnMerge(mockOctokit, mockContext, true);
      await action.run();

      expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
      expect(mockCreateRelease).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith("Dry run enabled: not creating release for 1.3.0");
      expect(core.setOutput).toHaveBeenCalledWith("release-version", "1.3.0");
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it("should set output but not create a release when dry-run is true for major release", async () => {
      const mockContext = createGithubContext({
        eventName: "pull_request",
        merged: true,
        labels: [{ name: "release/major" }],
      });

      mockGetLatestRelease.mockResolvedValueOnce({
        data: { name: "1.2.3" },
      });

      const action = new ReleaseOnMerge(mockOctokit, mockContext, true);
      await action.run();

      expect(mockGetLatestRelease).toHaveBeenCalledWith({ owner, repo });
      expect(mockCreateRelease).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith("Dry run enabled: not creating release for 2.0.0");
      expect(core.setOutput).toHaveBeenCalledWith("release-version", "2.0.0");
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe("target_commitish", () => {
    it("should pass merge_commit_sha as target_commitish when present in pull_request payload", async () => {
      const mockContext = createGithubContext({
        eventName: "pull_request",
        merged: true,
        labels: [{ name: "release/patch" }],
        mergeCommitSha: "abc123merge",
      });

      mockGetLatestRelease.mockResolvedValueOnce({
        data: { name: "v1.0.0" },
      });
      mockCreateRelease.mockResolvedValueOnce({
        data: { id: 100 },
      });

      const action = new ReleaseOnMerge(mockOctokit, mockContext);
      await action.run();

      expect(mockCreateRelease).toHaveBeenCalledWith({
        owner,
        repo,
        tag_name: "v1.0.1",
        name: "v1.0.1",
        target_commitish: "abc123merge",
        generate_release_notes: true,
      });
    });

    it("should fallback to context.sha as target_commitish when merge_commit_sha is not present", async () => {
      const mockContext = createGithubContext({
        eventName: "pull_request",
        merged: true,
        labels: [{ name: "release/patch" }],
        sha: "def456context",
      });

      mockGetLatestRelease.mockResolvedValueOnce({
        data: { name: "v1.0.0" },
      });
      mockCreateRelease.mockResolvedValueOnce({
        data: { id: 100 },
      });

      const action = new ReleaseOnMerge(mockOctokit, mockContext);
      await action.run();

      expect(mockCreateRelease).toHaveBeenCalledWith({
        owner,
        repo,
        tag_name: "v1.0.1",
        name: "v1.0.1",
        target_commitish: "def456context",
        generate_release_notes: true,
      });
    });

    it("should prefer merge_commit_sha over context.sha when both are present", async () => {
      const mockContext = createGithubContext({
        eventName: "pull_request",
        merged: true,
        labels: [{ name: "release/patch" }],
        mergeCommitSha: "abc123merge",
        sha: "def456context",
      });

      mockGetLatestRelease.mockResolvedValueOnce({
        data: { name: "v1.0.0" },
      });
      mockCreateRelease.mockResolvedValueOnce({
        data: { id: 100 },
      });

      const action = new ReleaseOnMerge(mockOctokit, mockContext);
      await action.run();

      expect(mockCreateRelease).toHaveBeenCalledWith({
        owner,
        repo,
        tag_name: "v1.0.1",
        name: "v1.0.1",
        target_commitish: "abc123merge",
        generate_release_notes: true,
      });
    });
  });
});
