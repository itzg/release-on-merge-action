# Release on Merge Action

A GitHub Action that automatically creates semantic versioned GitHub Releases and tags when a pull request is merged, based on PR release labels.

The original motivation was to streamline the process of accepting a Dependabot or Renovate dependency update PR and subsequently bumping the release version of the project to pick up the change. 

## Features

- **Automated Releases**: Creates a new GitHub Release with automatically generated release notes when a labeled PR is merged.
- **Semantic Versioning**: Automatically calculates the next semantic version (`patch`, `minor`, or `major`) based on the repository's latest release.
- **Prefix Preservation**: Retains version prefix formatting (e.g., `v1.2.3` vs `1.2.3`) matching your repository's existing release naming style.
- **Dry Run Support**: Test release calculation and downstream steps without creating an actual release or tag.
- **Step Outputs**: Exports the calculated/created version string (`release-version`) for downstream workflow jobs.

---

## How It Works

1. The action triggers when a pull request is closed and merged.
2. It inspects the labels on the pull request for a label starting with `release/` (`release/patch`, `release/minor`, or `release/major`).
3. If a valid release label is present, it fetches the repository's latest release. It's completely normal to not include a release label if no release will be needed from the merged PR.
4. It parses the semantic version and increments it according to the label type.
5. Unless `dry-run` is enabled, it creates a new GitHub Release with the incremented tag/name and automatically generated release notes.
6. Sets the `release-version` output.

---

## Prerequisites

1. **Initial Release**: The repository must have at least one existing release with a semantic version name (e.g., `v1.0.0` or `1.0.0`) so the action can determine the baseline version.
2. **Release Labels**: Create the following labels in your repository:
   - `release/patch` (for bug fixes and patch updates)
   - `release/minor` (for new backward-compatible features)
   - `release/major` (for breaking changes)

---

## Usage

### Basic Example

Add a workflow file (e.g. `.github/workflows/release.yml`) to your repository:

```yaml
name: Release on Merge

on:
  pull_request:
    types: [closed]

jobs:
  release:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Create Release
        id: release
        uses: ./ # or owner/release-on-merge-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Log Release Version
        if: steps.release.outputs.release-version != ''
        run: |
          echo "Successfully released version: ${{ steps.release.outputs.release-version }}"
```

### Dry Run Example

Preview the calculated version without creating a release or modifying Git tags:

```yaml
name: Preview Release

on:
  pull_request:
    types: [closed]

jobs:
  dry-run-release:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Calculate Next Version
        id: release
        uses: ./ # or owner/release-on-merge-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          dry-run: true

      - name: Display Next Version
        if: steps.release.outputs.release-version != ''
        run: |
          echo "Next release version would be: ${{ steps.release.outputs.release-version }}"
```

### Triggering Workflows on Release Creation (Using a PAT)

Events triggered by the default `GITHUB_TOKEN` do not trigger new workflow runs. If you have separate workflows triggered by release creation (such as package publishing or deployment workflows), use a Personal Access Token (PAT) with `repo` scope:

```yaml
- name: Create Release
  uses: ./ # or owner/release-on-merge-action@v1
  with:
    token: ${{ secrets.RELEASE_PAT }}
```

---

## Inputs

| Input | Description | Required | Default |
| --- | --- | --- | --- |
| `token` | GitHub token used for release operations. Pass a PAT if you need release creation to trigger downstream workflows. | No | `${{ github.token }}` |
| `dry-run` | When set to `true`, calculates the next version and sets outputs without creating a release or tag. | No | `'false'` |

---

## Outputs

| Output | Description |
| --- | --- |
| `release-version` | The semantic version of the release that was created (or calculated during a dry run). |

---

## Release Labels Reference

| Label | SemVer Increment | Example (from `v1.2.3`) |
| --- | --- | --- |
| `release/patch` | Patch (`0.0.X`) | `v1.2.4` |
| `release/minor` | Minor (`0.X.0`) | `v1.3.0` |
| `release/major` | Major (`X.0.0`) | `v2.0.0` |

> **Note:** If a pull request has no `release/*` label, or has an unrecognized label, the action finishes without creating a release.

---

## Development

### Setup & Testing

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Build action bundle
npm run build
```

### Testing with `act`

You can test local GitHub Actions workflows using [act](https://github.com/nektos/act):

```bash
# Test with a patch release event
npm run test:act:patch

# Test with a minor release event
npm run test:act:minor

# Test with a major release event
npm run test:act:major

# Test with an unmerged PR event
npm run test:act
```

---

## License

This project is licensed under the [MIT License](LICENSE).
