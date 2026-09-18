import { decode } from "html-entities";

const value = decode("ARTIST SPOTLIGHT RHIA BELLO &#8211; THE ETHEREAL SOUL OF AFRO-ALTÉ", { level: "all" });
if (value.includes("&#8211;") || !value.includes("–")) {
  throw new Error(`Entity normalization failed: ${value}`);
}
console.log(value);
