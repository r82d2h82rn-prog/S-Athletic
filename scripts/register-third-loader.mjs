import {register} from 'node:module';
register('./third-loader.mjs',import.meta.url);
