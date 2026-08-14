# uv-managed Python 3.13

## Goal

Make CPython 3.13 the default Python available to local development, pin this repository to the Python 3.13 minor release, and make GitHub Actions install and verify that same uv-managed interpreter.

## Scope

- Install the latest available CPython 3.13 patch release with `uv`.
- Expose the uv-managed version as the local user's `python` and `python3` commands.
- Add a committed `.python-version` file containing `3.13` to pin the repository's required minor version.
- Update the deployment workflow to install `uv`, provision the pinned managed interpreter, and verify it before the existing Node build.

## Local environment

Use `uv python install 3.13 --default` so uv maintains the latest patch within the 3.13 series while providing `python` and `python3` launchers. Update shell configuration only if `~/.local/bin` is not already on `PATH`.

Use `uv python pin --global 3.13` to make 3.13 the default uv request outside projects. The repository's local pin takes precedence whenever work occurs in this checkout.

## Repository configuration

`.python-version` is the only Python configuration committed to this TypeScript application. It is portable across uv and other version managers, and avoids inventing a Python package solely to express a runtime constraint.

Do not add `pyproject.toml`, `uv.lock`, Python dependencies, or a virtual environment: the application and its build remain Node-based.

## CI flow

In `.github/workflows/deploy.yml`, retain the existing Node 20 setup and build steps. Before them, add a `uv` setup step, then run `uv python install --managed-python` and `uv python find --managed-python 3.13`. These commands consume the checked-in `.python-version`, ensure CI uses an uv-managed CPython 3.13 interpreter, and fail early if the pin cannot be provisioned.

## Validation

- Confirm `python --version` and `python3 --version` resolve to CPython 3.13 after opening a fresh shell.
- Confirm `uv python find --managed-python 3.13` resolves an installed interpreter in the repository.
- Validate the GitHub Actions YAML syntax and run the existing `npm test` and `npm run build` checks.

## Non-goals

- Replacing macOS's system Python at `/usr/bin/python3`.
- Converting this TypeScript application into a Python or uv package project.
- Changing the Node.js runtime or package manager.
