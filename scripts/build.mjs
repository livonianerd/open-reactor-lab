import {mkdir,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const f of ['index.html','style.css','src'])await cp(f,`dist/${f}`,{recursive:true});
console.log('Built static application in dist/');
