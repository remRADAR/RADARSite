import { chromium } from "playwright";
const ROUTES = ["/", "/about/our-story", "/remradar", "/radarmusic/podcast", "/playlists"];
const browser = await chromium.launch();
const out = [];
for (const vp of [{n:"desktop",w:1440,h:900},{n:"mobile",w:390,h:844}]) {
  const ctx = await browser.newContext({ viewport:{width:vp.w,height:vp.h} });
  const page = await ctx.newPage();
  for (const theme of ["dark","light"]) {
    for (const r of ROUTES) {
      try {
        await page.goto("http://localhost:3000"+r, {waitUntil:"domcontentloaded", timeout:45000});
        await page.evaluate(t=>{document.documentElement.classList.toggle("theme-light", t==="light");}, theme);
        await page.waitForTimeout(900);
        const res = await page.evaluate(() => {
          const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[,\s/]+/).filter(Boolean).map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};};
          const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
          const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)};
          const blend=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
          const effBg=el=>{let n=el,acc=null;while(n&&n!==document.documentElement.parentNode){const cs=getComputedStyle(n);const bg=parse(cs.backgroundColor);const img=cs.backgroundImage&&cs.backgroundImage!=="none";if(bg&&bg.a>0){acc=acc?blend(acc,bg):bg;if(acc.a>=0.999)return{color:acc,image:img};}if(img)return{color:acc&&acc.a>0?acc:{r:0,g:0,b:0,a:1},image:true};n=n.parentElement;}return{color:acc&&acc.a>0?acc:{r:255,g:255,b:255,a:1},image:false};};
          const bad=[];const seen=new Set();
          const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
          while((n=w.nextNode())){const t=n.textContent.trim();if(!t||t.length<2)continue;const el=n.parentElement;if(!el||seen.has(el))continue;seen.add(el);
            const cs=getComputedStyle(el);if(cs.visibility==="hidden"||cs.display==="none")continue;if(parseFloat(cs.opacity)<0.15)continue;
            const rc=el.getBoundingClientRect();if(rc.width<2||rc.height<2)continue;
            const fgR=parse(cs.color);if(!fgR)continue;const bi=effBg(el);const fg=fgR.a<1?blend(fgR,bi.color):fgR;const cr=ratio(fg,bi.color);
            const sz=parseFloat(cs.fontSize);const wt=parseInt(cs.fontWeight,10)||400;const lg=sz>=24||(sz>=18.66&&wt>=700);const min=lg?3:4.5;
            if(cr<min)bad.push({text:t.slice(0,50),cls:(typeof el.className==="string"?el.className:"").slice(0,60),fg:`rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,bg:`rgb(${Math.round(bi.color.r)},${Math.round(bi.color.g)},${Math.round(bi.color.b)})`,ratio:Math.round(cr*100)/100,min,img:bi.image});}
          return bad;});
        for(const f of res) out.push({route:r,theme,vp:vp.n,...f});
      } catch(e){ out.push({route:r,theme,vp:vp.n,error:String(e).slice(0,90)}); }
    }
  }
  await ctx.close();
}
await browser.close();
const errs=out.filter(f=>f.error);
const bad=out.filter(f=>!f.error);
console.log("checked:", out.length-errs.length, "errors:", errs.length, "failures:", bad.length);
for(const f of bad) console.log(`  [${f.theme}/${f.vp}] ${f.ratio}:1 (min ${f.min}) ${f.fg} on ${f.bg}${f.img?" [img]":""} «${f.cls}» "${f.text}"`);
for(const e of errs.slice(0,5)) console.log("  ERR", e.route, e.error);
