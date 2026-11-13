# About Page Delivery

## Build the second About frame: branded founder pass

- Keep RADAR Explore as the first frame.
- Bring the existing founder Framer/lanyard pass into a second frame directly after RADAR Explore.
- Remove visible explanatory text outside the pass that describes how to drag, swing, or operate the component.
- Reduce the founder name and supporting card typography so the pass reads cleanly at the new frame scale.
- Rebrand the pass so it carries `REM` on the reverse and clearly belongs to REM/RADARCharts.
- Keep the current founder portrait as a temporary image until the replacement image is supplied.

## Add the founder highlight interaction

- Make the founder pass clickable and tappable.
- On activation, reveal a compact highlight box with concise, verified founder details.
- Support closing the highlight box with a close control and the Escape key.
- Preserve drag/touch movement, keyboard swing controls, and reduced-motion behavior.

## Keep ecosystem separate and concise

- Move ecosystem details out of the About narrative into `/about/ecosystem`.
- Keep the ecosystem destination to one straightforward page with no bulky explanatory sequence.
- Add a simple About-page ecosystem tab/link that takes the visitor to `/about/ecosystem`.

## Validate and deliver

- Run lint and typecheck after the implementation.
- Verify the About route and founder activation behavior in the local preview.
- Commit and push the completed About and ecosystem changes to `origin/main`.
- Deploy the updated `main` build to the `radarsite-staging` Cloudflare Worker and smoke-test the staging route.
