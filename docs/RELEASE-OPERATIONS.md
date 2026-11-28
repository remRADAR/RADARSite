# Release Operations

The reusable process for RADARSite repository releases is captured in the `radar-repo-operations` skill. The short form is:

1. Inspect branch, package version, project instructions, tags, releases, milestones, and wiki state.
2. Read `src/app/globals.css` before changing the HTML wiki family; preserve the Editorial Brutalist tokens and reduced-motion behavior.
3. Record verified work in `docs/MILESTONES.md` with commit links and explicit evidence boundaries.
4. Ensure every local wiki navigation link resolves to a real file under `public/wiki/`.
5. Run the appropriate lint, typecheck, build, and focused contract tests.
6. Commit the documented state, create an annotated `v<package-version>` tag, and create a GitHub release with completed work, checks, warnings, and links.
7. Publish the wiki through its initialized GitHub wiki repository or web interface; retain the themed HTML source in this repository.
8. Add or update the skill in RADARMatrix, regenerate its manifest, run its tests, commit, and push.

Never use a wiki page or release note as proof of deployment, live credentials, or provider-side state.
