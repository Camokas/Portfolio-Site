// Optional local asset preparation. Deployment reads the committed results;
// ffmpeg/ffprobe are not required on GitHub Pages.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const registryPath = 'src/data/videoMetadata.json';
const registry = existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, 'utf8')) : {};
const files = [];
function scan(directory, prefix = 'projects') {
  for (const entry of readdirSync(directory, {withFileTypes:true})) {
    const file = join(directory, entry.name), relative = prefix + '/' + entry.name;
    if (entry.isDirectory()) scan(file, relative);
    else if (/\.(webm|mp4)$/i.test(entry.name)) files.push([file, relative]);
  }
}
scan('public/projects');
let prepared = 0;
for (const [file, relative] of files) {
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (registry[relative]?.hash === hash && existsSync('public/' + registry[relative].poster)) continue;
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v','error','-select_streams','v:0',
    '-show_entries','stream=width,height:format=duration','-of','json',file], {encoding:'utf8',windowsHide:true}));
  const {width,height} = metadata.streams[0];
  const poster = posix.dirname(relative) + '/_previews/' + hash.slice(0,16) + '.webp';
  mkdirSync('public/' + posix.dirname(poster), {recursive:true});
  const seek = Math.min(.5, Number(metadata.format.duration || 1) / 4);
  execFileSync('ffmpeg', ['-hide_banner','-loglevel','error','-ss',String(seek),'-i',file,
    '-frames:v','1','-vf',"scale='min(960,iw)':-2",'-quality','82','-y','public/'+poster], {windowsHide:true});
  registry[relative] = {width,height,poster,hash};
  prepared++;
}
writeFileSync(registryPath, JSON.stringify(Object.fromEntries(Object.entries(registry).sort()),null,2)+'\n');
console.log('Prepared '+prepared+' video previews; '+files.length+' local videos indexed.');
