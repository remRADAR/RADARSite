# Northlight deployment diagnosis notes

## Verified on 2026-09-03

- Repository: `remRADAR/northlight`; fork of `Cheemaboi/NORTHLIGHT`; branch `main`; HEAD `451be58`.
- GitHub repository metadata reports homepage URL: https://northlight-bice.vercel.app
- Vercel connected-project inventory for the remRADAR team did not list a `northlight` project, so the deployment may be an independently linked or legacy Vercel project. This is not yet a confirmed root cause.
- Live Vercel homepage opened successfully in the browser at https://northlight-bice.vercel.app/.
- Live page title: `NORTHLIGHT — Creative Agency & Production House`.
- Live page rendered the expected editorial-brutalist homepage with navigation, hero, capabilities, selected work, proof, contact, and footer content.
- Local homepage also opened successfully at http://127.0.0.1:3000/ and rendered the same main content structure.
- Visual difference observed in the captured screenshots: live Vercel shows the intended cream header / black hero composition, while local screenshot displayed a large orange hero field and missing/late header content at capture time. This suggests local asset/loading/runtime differences or a transient initialization state; it is not yet a confirmed deployment failure.
- No credentials, private data, or protected routes were accessed.

## Next checks

1. Inspect browser console and failed network requests on both deployments.
2. Check `/work`, `/work/halcyon-rebrand`, and `/login` on live and local.
3. Run lint, build, and the available end-to-end tests.
4. Inspect Vercel project/deployment records if the exact Vercel project can be identified.

## Additional route verification

The live Vercel `/work` route rendered successfully with the work index, category filters, three case-study cards, and image assets. The live `/login` route also rendered successfully as an intentional mock client sign-in page; no credentials were submitted. These checks show that the deployed site is reachable and its main route tree is functioning in the browser.
