# Release

## Setup

```bash
$ brew install node@20
$ make install
```

## Develop

```bash
$ make format
$ make lint
$ make test
```

## Publish

```bash
$ vi package.json
$ vi package-lock.json
$ make build
$ git add .
$ git commit -m 'Bump version 1.0.13 -> 1.1.0'
$ git tag -a v1.1.0 -m 'version 1.1.0'
$ git push --follow-tags
$ git tag -fa v1 -m "Update v1 tag"
$ git push origin v1 --force
```

Go to [GitHub Releases](https://github.com/act10ns/slack/releases) and create a new release

## References 

See [Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to understand version strategy.

See [Publishing actions in GitHub Marketplace](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace) for general information about how to make actions available on GitHub.
