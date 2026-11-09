export const toolSlug = (name: string) => name.toLowerCase().replace(/ /g, '-');
const monochrome=new Set(['ChatGPT','GitHub','Vercel','v0','Copilot','Railway']);
const pngIcons=new Set(['Clawd','clawd','9router','9route','Google AI Studio']);
export default function ToolIcon({ name }: { name: string }) {
  if(name==='Kimi')return <span className="brand-tool-icon tool-kimi"><img className="kimi-dark" src="/images/tools/kimi.svg" alt="" width="28" height="28" loading="lazy"/><img className="kimi-light" src="/images/tools/kimi-light.svg" alt="" width="28" height="28" loading="lazy"/></span>;
  const ext = pngIcons.has(name) ? 'png' : 'svg';
  const slug = (name === '9route' || name === '9router') ? '9router' : toolSlug(name);
  return <img className={`brand-tool-icon tool-${slug} ${monochrome.has(name)?'tool-monochrome':''} ${name==='Codex'?'tool-reverse':''}`} src={`/images/tools/${slug}.${ext}`} alt="" width="28" height="28" loading="lazy"/>;
}
