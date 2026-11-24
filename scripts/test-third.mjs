import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=new URL('../stages/third/upstream/',import.meta.url),pkg=JSON.parse(await readFile(new URL('package.json',source),'utf8'));
const commands=pkg.scripts.test.split(' && ');
for(const command of commands){if(!/^node [a-z0-9-]+\.mjs$/.test(command))throw Error('Unexpected upstream test command');
 const file=command.slice(5);console.log('\n3rd / '+file);
 const result=spawnSync(process.execPath,['--import',fileURLToPath(new URL('./register-third-loader.mjs',import.meta.url)),file],{cwd:fileURLToPath(source),stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
console.log(`\nAll ${commands.length} original 3rd test suites passed.`);
