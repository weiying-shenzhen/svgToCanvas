function genMethod(){
  const args = Array.prototype.slice.call(arguments)
  const params = args.slice(1, args.length)
  const method = `.${args[0]}`

  if (!params.length) return `${method}()`
  return `${method}(${params.join(',')})`
}

function genPathCommandsCodes(commands) {
  let lastPos = [0, 0], pointOne, pointTwo

  return commands.reduce((acc, command) => {
    switch (command.marker) {
      case "z":
      case "Z":
        lastPos = [0, 0]
        return acc.concat(genMethod("closePath"))
      case "m":
        lastPos = [lastPos[0] + command.values[0], lastPos[1] + command.values[1]]
        return acc.concat(genMethod("moveTo", lastPos[0], lastPos[1]))
      case 'l':
        lastPos = [lastPos[0] + command.values[0], lastPos[1] + command.values[1]]
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]))
      case 'h':
        lastPos = [lastPos[0] + command.values[0], lastPos[1]]
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]))
      case 'v':
        lastPos = [lastPos[0], lastPos[1] + command.values[0]]
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]))
      case 'c':
        pointOne = [lastPos[0] + command.values[0], lastPos[1] + command.values[1]]
        pointTwo = [lastPos[0] + command.values[2], lastPos[1] + command.values[3]]
        lastPos = [lastPos[0] + command.values[4], lastPos[1] + command.values[5]]
        return acc.concat(genMethod("bezierCurveTo", pointOne[0], pointOne[1], pointTwo[0], pointTwo[1], lastPos[0], lastPos[1]))
      case 'M':
        lastPos = [command.values[0], command.values[1]]
        return acc.concat(genMethod("moveTo", lastPos[0], lastPos[1]))
      case 'L':
        lastPos = [command.values[0], command.values[1]]
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]))
      case 'H':
        lastPos = [command.values[0], lastPos[1]]
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]))
      case 'V':
        lastPos = [lastPos[0], command.values[0]]
        return acc.concat(genMethod("lineTo", lastPos[0], lastPos[1]))
      case 'C':
        pointOne = [command.values[0], command.values[1]]
        pointTwo = [command.values[2], command.values[3]]
        lastPos = [command.values[4], command.values[5]]
        return acc.concat(genMethod("bezierCurveTo", pointOne[0], pointOne[1], pointTwo[0], pointTwo[1], lastPos[0], lastPos[1]))
    }
    return acc
  }, [])
}

function genPathCodes(path) {
  const { fill, transform, stroke, commands } = path
  const hasFill = !!fill && fill[0] === "#"
  const hasStroke = !!stroke && stroke[0] === "#"
  let codes = []

  codes.push(genMethod("save"))

  if (transform) codes.push(`.${transform}.`)
  if (hasFill) codes.push(genMethod("fillStyle", `'${fill}'`))
  if (hasStroke) {
    codes.push(genMethod("strokeStyle", `'${stroke}'`))
    if (path['stroke-width']) codes.push(genMethod("lineWidth", `'${path['stroke-width']}'`))
  }

  codes = codes.concat(genPathCommandsCodes(commands))

  if (hasFill) codes.push(genMethod("fill"))
  if (hasStroke) codes.push(genMethod("stroke"))

  codes.push(genMethod("restore"))

  return codes
}

export default function genCodes(info) {
  const size = info.size
  const header = `new WeCanvas({ width: ${size.width}, height: ${size.height} })\n`
  const codes = info.paths.reduce((acc, path) => acc.concat(genPathCodes(path)), []).join('\n')

  return header + codes
}