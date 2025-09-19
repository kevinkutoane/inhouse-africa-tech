#!/usr/bin/env node
// scans blog/*.md, extracts simple front-matter (key: value per line), builds posts.json
import fs from 'fs';
import path from 'path';

const BLOG_DIR = path.resolve(process.cwd(), 'blog');
const OUT_FILE = path.join(BLOG_DIR, 'posts.json');

function parseFrontMatter(text){
  const res = {};
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  let content = text;
  if (m){
    const body = m[1];
    body.split('\n').forEach(line=>{
      const idx = line.indexOf(':');
      if (idx>-1){
        const key = line.slice(0,idx).trim();
        let val = line.slice(idx+1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))){ val = val.slice(1,-1); }
        res[key] = val;
      }
    });
    content = text.slice(m[0].length);
  }
  return { frontMatter: res, content };
}

function extractExcerpt(content, maxLen=160){
  const noHead = content.replace(/^#+\s.*$/gm,'').replace(/\n+/g,' ').trim();
  if (noHead.length<=maxLen) return noHead;
  return noHead.slice(0,maxLen).trim() + '...';
}

const files = fs.readdirSync(BLOG_DIR).filter(f=>f.endsWith('.md'));
const posts = files.map(file=>{
  const full = path.join(BLOG_DIR, file);
  const txt = fs.readFileSync(full, 'utf8');
  const { frontMatter, content } = parseFrontMatter(txt);
  const title = frontMatter.title || (()=>{ const m=content.match(/^#\s+(.+)$/m); return m?m[1].trim():'Untitled Post'; })();
  const date = frontMatter.date || fs.statSync(full).mtime.toISOString().split('T')[0];
  const excerpt = frontMatter.excerpt || extractExcerpt(content, 160);
  // prefer explicit thumbnail, but fall back to image and mark useImageAsThumbnail
  const thumbnail = frontMatter.thumbnail || frontMatter.image || '';
  const useImageAsThumbnail = !!(frontMatter.image && !frontMatter.thumbnail);
  const image = frontMatter.image || '';
  return { title, file, date, excerpt, image, thumbnail, useImageAsThumbnail };
});

// sort newest first
posts.sort((a,b)=> new Date(b.date) - new Date(a.date));
fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2), 'utf8');
console.log('Wrote', OUT_FILE);
