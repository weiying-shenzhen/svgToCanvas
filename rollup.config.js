import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/index.js',
  moduleName: "svg2canvas",
  format: 'umd',
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  dest: 'lib/path.js'
};