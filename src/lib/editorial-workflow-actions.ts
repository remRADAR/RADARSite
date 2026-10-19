// Teamily-ready workflow action contracts for the RADARCharts Automated Editorial
// Publishing Network. Each action is independently testable, returns a structured
// result, and failed jobs resume from the last confirmed step. This registry is a
// pure definition: Teamily (or any orchestrator) wires these actions together; it
// does not duplicate publishing logic.

export type WorkflowActionId =
  | "intake-validation"
  | "research-verification"
  | "article-generation"
  | "seo-entity-audit"
  | "media-processing"
  | "notion-upsert"
  | "editorial-approval"
  | "radarsite-publication"
  | "live-page-verification"
  | "publication-receipt";

export type WorkflowActionDefinition = {
  id: WorkflowActionId;
  title: string;
  /** Actions that must be confirmed before this one can run. */
  requires: WorkflowActionId[];
  /** Side effects: actions marked true must never run without explicit authorization. */
  hasSideEffects: boolean;
  resultShape: string;
};

export const WORKFLOW_ACTIONS: WorkflowActionDefinition[] = [
  { id: "intake-validation", title: "Intake validation", requires: [], hasSideEffects: false, resultShape: "{ ok, errors, warnings }" },
  { id: "research-verification", title: "Research and fact verification", requires: ["intake-validation"], hasSideEffects: false, resultShape: "{ verifiedClaims, unresolvedDiscrepancies, sourceUrls }" },
  { id: "article-generation", title: "Article generation", requires: ["research-verification"], hasSideEffects: false, resultShape: "{ articlePackage }" },
  { id: "seo-entity-audit", title: "SEO and entity audit", requires: ["article-generation"], hasSideEffe\Î[ÙK\Ý[Ú\NÈÙ[ÐÛÛ\]K[]Q\ØÜ\[ÚY\ÈHKÈYYYXK\ØÙ\ÜÚ[È]NYYXHØÙ\ÜÚ[È\]Z\\ÎÈ[ZÙK][Y][ÛK\ÔÚYQYXÝÎYK\Ý[Ú\NÈX[Y\ÝÝÜYÙT\Ý[ÈHKÈYÝ[Û]\Ù\]NÝ[ÛÜX]KÝ\]H\]Z\\ÎÈ\XÛKYÙ[\][ÛÙ[ËY[]KX]Y]YYXK\ØÙ\ÜÚ[ÈK\ÔÚYQYXÝÎYK\Ý[Ú\NÈÝ[ÛXÛÜ\Ý]HHKÈYY]ÜX[X\Ý[]NY]ÜX[\Ý[\]Z\\ÎÈÝ[Û]\Ù\K\ÔÚYQYXÝÎ[ÙK\Ý[Ú\NÈ\ÝY\Ý\\ÝY]HKÈYY\Ú]K\XXØ][Û]NQTÚ]HXXØ][Û\]Z\\ÎÈY]ÜX[X\Ý[K\ÔÚYQYXÝÎYK\Ý[Ú\NÈÛ\ÒYX\ÚY]XXHHKÈY]K\YÙK]\YXØ][Û]N]K\YÙH\YXØ][Û\]Z\\ÎÈY\Ú]K\XXØ][ÛK\ÔÚYQYXÝÎ[ÙK\Ý[Ú\NÈ]U\\YYY]Y[ÙHHKÈYXXØ][Û\XÙZ\]NXXØ][ÛXÙZ\\]Z\\ÎÈÝ[Û]\Ù\K\ÔÚYQYXÝÎ[ÙK\Ý[Ú\NÈXÙZ\HKNÂ^Ü\HÛÜÙÝÔÝ]HHÂÊXÝ[ÛÈÛÛ\YYÛÛ\]K[^XÝ][ÛÜ\
ÂÛÛ\YYÛÜÙÝÐXÝ[ÛY×NÂZ[YÎÈXÝ[ÛÛÜÙÝÐXÝ[ÛYÈX\ÛÛÝ[ÎÈ]Ý[ÈNÂNÂ^Ü[Ý[ÛY[][ÛYÛÜÙÝÐXÝ[ÛY
NÛÜÙÝÐXÝ[ÛY[][ÛÂÛÛÝÝ[HÓÔÑÕ×ÐPÕSÓË[

XÝ[ÛHOXÝ[ÛYOOHY
NÂY
YÝ[
HÝÈ]È\Ü[ÛÝÛÛÜÙÝÈXÝ[Û	ÚYX
NÂ]\Ý[ÂBÊ]\ÈHÚ[ÛH^[XHXÝ[ÛY\H\ÝÛÛ\YYÝ\Ü[Ú[Ý[È]ÈØ[[
Â^Ü[Ý[Û^[XPXÝ[ÛÝ]NÛÜÙÝÔÝ]JNÛÜÙÝÐXÝ[ÛY[ÂÛÛÝÛHH]ÈÙ]
Ý]KÛÛ\YY
NÂÛÛÝØ[Y]\ÈHÓÔÑÕ×ÐPÕSÓË[\
XÝ[ÛHOYÛK\ÊXÝ[ÛY
H	XÝ[Û\]Z\\Ë]\J
\]Z\[Y[
HOÛK\Ê\]Z\[Y[
JJNÂY
Ý]KZ[Y
HÂËÈ\Ý[XXHÛHH\ÝÛÛ\YYÝ\ÛHHZ[YXÝ[Û]Ù[Ü]ÛH[XHXÝ[ÛÈX^HØÙYYÛÛÝZ[Y[^HÓÔÑÕ×ÐPÕSÓË[[^

XÝ[ÛHOXÝ[ÛYOOHÝ]KZ[YXÝ[ÛNÂ]\Ø[Y]\Â[\
XÝ[ÛHOÓÔÑÕ×ÐPÕSÓË[[^

Ø[Y]JHOØ[Y]KYOOHXÝ[ÛY
HHZ[Y[^
BX\

XÝ[ÛHOXÝ[ÛY
VÌH[ÂB]\Ø[Y]\ÖÌOËY[ÂBÊ[Y]\ÈHÜÜÙY[Ú][ÛY]ÜX[\Ý[\ÈH\Ø]HYÜHXXØ][Û
Â^Ü[Ý[ÛØ[[XÝ[ÛÝ]NÛÜÙÝÔÝ]KXÝ[ÛYÛÜÙÝÐXÝ[ÛY
NÈÚÎÛÛX[ÈX\ÛÛÎÝ[ÈHÂÛÛÝÛHH]ÈÙ]
Ý]KÛÛ\YY
NÂÛÛÝ\Ù]HY[][ÛXÝ[ÛY
NÂÛÛÝZ\ÜÚ[ÈH\Ù]\]Z\\Ë[\
\]Z\[Y[
HOYÛK\Ê\]Z\[Y[
JNÂY
Z\ÜÚ[Ë[Ý
H]\ÈÚÎ[ÙKX\ÛÛ[ÛÛ\YY\\]Z\Ú]\Î	ÛZ\ÜÚ[ËÚ[_XNÂY
ÛK\ÊXÝ[ÛY
JH]\ÈÚÎ[ÙKX\ÛÛXÝ[Û[XYHÛÛ\YYNÂY

XÝ[ÛYOOHY\Ú]K\XXØ][ÛXÝ[ÛYOOH]K\YÙK]\YXØ][ÛH	YÛK\ÊY]ÜX[X\Ý[JHÂ]\ÈÚÎ[ÙKX\ÛÛY]ÜX[\Ý[Ø]H\ÈÝY[\ÜÙYNÂB]\ÈÚÎYHNÂBÊXÛÜÈHÛÛ\YYXÝ[Û\Ù\[ÈÜ\
Â^Ü[Ý[ÛÛÛ\PXÝ[ÛÝ]NÛÜÙÝÔÝ]KXÝ[ÛYÛÜÙÝÐXÝ[ÛY
NÛÜÙÝÔÝ]HÂY
\Ý]KÛÛ\YY[ÛY\ÊXÝ[ÛY
JH]\ÈÝ]KÛÛ\YYËÝ]KÛÛ\YYXÝ[ÛYHNÂ]\Ý]NÂBÊXÛÜÈHZ[YXÝ[ÛÚ]Ý]\ØØ\[ÈÛÛ\YYÝ\Ë
Â^Ü[Ý[ÛZ[XÝ[ÛÝ]NÛÜÙÝÔÝ]KXÝ[ÛYÛÜÙÝÐXÝ[ÛYX\ÛÛÝ[ÊNÛÜÙÝÔÝ]HÂ]\ÈÝ]KZ[YÈXÝ[ÛXÝ[ÛYX\ÛÛ]]È]J
KÒTÓÔÝ[Ê
HHNÂB