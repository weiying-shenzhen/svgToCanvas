import genCodes from './codegen'
import parse from './parse'

export default (svg) => genCodes(parse(svg))
