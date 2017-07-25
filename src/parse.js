const htmlParser = require('../lib/htmlParser')

const svgViewBoxRegEx = /([0-9]*\.?\d+) ([0-9]*\.?\d+) ([0-9]*\.?\d+) ([0-9]*\.?\d+)/g
const markerRegEx = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
const digitRegEx = /-?[0-9]*\.?\d+/g;

const formatNumber = str => ~~(0.5 + parseFloat(str))

export default function parse(svg) {
  const tree = htmlParser(svg).children[0]

  return {
    size: getSvgSize(tree),
    paths: getSvgPaths(tree)
  }
}

function getSvgSize(tree) {
  let size = {}

  tree.attributes.viewBox.replace(svgViewBoxRegEx, ($0, $1, $2, $3, $4) => {
    size["width"] = $3;
    size["height"] = $4;
  })
  return size
}

function pathDToCommands(str) {
    const results = [];
    let match;
    while ((match = markerRegEx.exec(str)) !== null) results.push(match)
    return results
        .map(function(match) {
            return { marker: str[match.index],
                     index: match.index };
        })
        .reduceRight(function(all, cur) {
            const chunk = str.substring(cur.index, all.length ? all[all.length - 1].index : str.length);
            return all.concat([
               { marker: cur.marker,
                 index: cur.index,
                 chunk: (chunk.length > 0) ? chunk.substr(1, chunk.length - 1) : chunk }
            ]);
        }, [])
        .reverse()
        .map(function(command) {
            const values = command.chunk.match(digitRegEx);
            return { marker: command.marker, values: values ? values.map(formatNumber) : []};
        })
}

function getSvgPaths(tree) {
  const paths = []
  const stack = [].concat(tree.children.map((child) => child))

  while(stack.length) {
    const node = stack.pop()
    const children = node.children || {}

    if (node.tagName === "path") {
      let pathAttributes = node.attributes
      pathAttributes.commands = pathDToCommands(pathAttributes.d)

      paths.push(pathAttributes)
    }

    if (children.length) {
      children.forEach((child) => stack.unshift(child))
    }
  }

  return paths
}