(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.svg2canvas = factory());
}(this, (function () { 'use strict';

function genMethod() {
  var args = Array.prototype.slice.call(arguments);
  var params = args.slice(1, args.length);
  var method = "." + args[0];

  if (!params.length) return method + "()";
  return method + "(" + params.join(',') + ")";
}

function genPathCommandsCodes(commands) {
  var lastPos = [0, 0],
      pointOne = void 0,
      pointTwo = void 0;

  return commands.reduce(function (acc, command) {
    switch (command.marker) {
      case "z":
      case "Z":
        lastPos = [0, 0];
        return acc.concat(genMethod("closePath"));
      case "m":
        lastPos = [lastPos[0] + command.values[0], lastPos[1] + command.values[1]];
        return acc.concat(genMethod("moveTo", lastPos[0], lastPos[1]));
      case 'l':
        lastPos = [lastPos[0] + command.values[0], lastPos[1] + command.values[1]];
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]));
      case 'h':
        lastPos = [lastPos[0] + command.values[0], lastPos[1]];
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]));
      case 'v':
        lastPos = [lastPos[0], lastPos[1] + command.values[0]];
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]));
      case 'c':
        pointOne = [lastPos[0] + command.values[0], lastPos[1] + command.values[1]];
        pointTwo = [lastPos[0] + command.values[2], lastPos[1] + command.values[3]];
        lastPos = [lastPos[0] + command.values[4], lastPos[1] + command.values[5]];
        return acc.concat(genMethod("bezierCurveTo", pointOne[0], pointOne[1], pointTwo[0], pointTwo[1], lastPos[0], lastPos[1]));
      case 'M':
        lastPos = [command.values[0], command.values[1]];
        return acc.concat(genMethod("moveTo", lastPos[0], lastPos[1]));
      case 'L':
        lastPos = [command.values[0], command.values[1]];
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]));
      case 'H':
        lastPos = [command.values[0], lastPos[1]];
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]));
      case 'V':
        lastPos = [lastPos[0], command.values[0]];
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]));
      case 'C':
        pointOne = [command.values[0], command.values[1]];
        pointTwo = [command.values[2], command.values[3]];
        lastPos = [command.values[4], command.values[5]];
        return acc.concat(genMethod("bezierCurveTo", pointOne[0], pointOne[1], pointTwo[0], pointTwo[1], lastPos[0], lastPos[1]));
    }
    return acc;
  }, []);
}

function genPathCodes(path) {
  var fill = path.fill,
      transform = path.transform,
      stroke = path.stroke,
      commands = path.commands;

  var hasFill = !!fill && fill[0] === "#";
  var hasStroke = !!stroke && stroke[0] === "#";
  var codes = [];

  codes.push(genMethod("save"));

  if (transform) codes.push("." + transform + ".");
  if (hasFill) codes.push(genMethod("fillStyle", "'" + fill + "'"));
  if (hasStroke) {
    codes.push(genMethod("strokeStyle", "'" + stroke + "'"));
    if (path['stroke-width']) codes.push(genMethod("lineWidth", "'" + path['stroke-width'] + "'"));
  }

  codes = codes.concat(genPathCommandsCodes(commands));

  if (hasFill) codes.push(genMethod("fill"));
  if (hasStroke) codes.push(genMethod("stroke"));

  codes.push(genMethod("restore"));

  return codes;
}

function genCodes(info) {
  var size = info.size;
  var header = "new WeCanvas({ width: " + size.width + ", height: " + size.height + " })\n";
  var codes = info.paths.reduce(function (acc, path) {
    return acc.concat(genPathCodes(path));
  }, []).join('\n');

  return header + codes;
}

var htmlParser = require('../lib/htmlParser');

var svgViewBoxRegEx = /([0-9]*\.?\d+) ([0-9]*\.?\d+) ([0-9]*\.?\d+) ([0-9]*\.?\d+)/g;
var markerRegEx = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
var digitRegEx = /-?[0-9]*\.?\d+/g;

var formatNumber = function formatNumber(str) {
  return ~~(0.5 + parseFloat(str));
};

function parse(svg) {
  var tree = htmlParser(svg).children[0];

  return {
    size: getSvgSize(tree),
    paths: getSvgPaths(tree)
  };
}

function getSvgSize(tree) {
  var size = {};

  tree.attributes.viewBox.replace(svgViewBoxRegEx, function ($0, $1, $2, $3, $4) {
    size["width"] = $3;
    size["height"] = $4;
  });
  return size;
}

function pathDToCommands(str) {
  var results = [];
  var match = void 0;
  while ((match = markerRegEx.exec(str)) !== null) {
    results.push(match);
  }return results.map(function (match) {
    return { marker: str[match.index],
      index: match.index };
  }).reduceRight(function (all, cur) {
    var chunk = str.substring(cur.index, all.length ? all[all.length - 1].index : str.length);
    return all.concat([{ marker: cur.marker,
      index: cur.index,
      chunk: chunk.length > 0 ? chunk.substr(1, chunk.length - 1) : chunk }]);
  }, []).reverse().map(function (command) {
    var values = command.chunk.match(digitRegEx);
    return { marker: command.marker, values: values ? values.map(formatNumber) : [] };
  });
}

function getSvgPaths(tree) {
  var paths = [];
  var stack = [].concat(tree.children.map(function (child) {
    return child;
  }));

  while (stack.length) {
    var node = stack.pop();
    var children = node.children || {};

    if (node.tagName === "path") {
      var pathAttributes = node.attributes;
      pathAttributes.commands = pathDToCommands(pathAttributes.d);

      paths.push(pathAttributes);
    }

    if (children.length) {
      children.forEach(function (child) {
        return stack.unshift(child);
      });
    }
  }

  return paths;
}

var index = (function (svg) {
  return genCodes(parse(svg));
});

return index;

})));
