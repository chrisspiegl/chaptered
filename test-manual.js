import fs from 'fs'
import path from 'path'
import { detectFileSync } from 'chardet'

import Chaptered from './index.js'

const filePath = path.resolve('./demo-markers/premiere-pro-markers-semicolon.csv')

const contents = fs.readFileSync(filePath, detectFileSync(filePath)).trim() // make sure to read file in correct encoding, premire needs utf-16le others may be differnt. https://stackoverflow.com/questions/50045841/how-to-detect-file-encoding-in-nodejs/50045951

const chaptered = new Chaptered({})

console.log(chaptered.parseTimecode('85:12:44:20'))
console.log(chaptered.parseTimecode('85:12:44.20'))
console.log(chaptered.parseTimecode('85;12;44;20'))
console.log(chaptered.parseTimecode('85;12;44.20'))
