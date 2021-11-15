import test from 'ava'
import fs from 'fs'
import path from 'path'
import { detectFileSync } from 'chardet'

import Chaptered from './index.js'

const filePathResolve = path.resolve('./demo-markers/resolve-edit-index.csv')
const filePathAudition = path.resolve('./demo-markers/audition-markers.csv')
const filePathPremiere = path.resolve('./demo-markers/premiere-pro-markers.csv')
const filePathPremiereSemicolon = path.resolve('./demo-markers/premiere-pro-markers-semicolon.csv')

const contentsResolve = fs.readFileSync(filePathResolve, detectFileSync(filePathResolve)).trim()
const contentsAudition = fs.readFileSync(filePathAudition, detectFileSync(filePathAudition)).trim()
const contentsPremiere = fs.readFileSync(filePathPremiere, detectFileSync(filePathPremiere)).trim() // make sure to read file in correct encoding, premire needs utf-16le others may be differnt. https://stackoverflow.com/questions/50045841/how-to-detect-file-encoding-in-nodejs/50045951
const contentsPremiereSemicolon = fs.readFileSync(filePathPremiereSemicolon, detectFileSync(filePathPremiereSemicolon)).trim() // make sure to read file in correct encoding, premire needs utf-16le others may be differnt. https://stackoverflow.com/questions/50045841/how-to-detect-file-encoding-in-nodejs/50045951

console.log('Test file currently being run:', test.meta.file);

test('chaptered options can be set', (t) => {
  const chaptered = new Chaptered({}).setOptions({
    format: {
      record: {
        time: {
          includeLeadingHours: 'never',
        },
      }
    },
  })

  t.is(chaptered.options.format.record.time.includeLeadingZeros, 'always')
  t.is(chaptered.options.format.record.time.includeLeadingHours, 'never')
  t.is(chaptered.options.format.sort.sortBy, 'timecode.in')
})

test('parseCSV throws', (t) => {
  const chaptered = new Chaptered({})
  t.throws(() => chaptered.parseCSV(), { instanceOf: Error, message: 'input must be set' })
  chaptered.setInput('foo')
  t.throws(() => chaptered.parseCSV(), { instanceOf: Error, message: 'determinFiletype must be run before' })
})

test('parseTimecode', (t) => {
  const chaptered = new Chaptered({})
  t.like(chaptered.parseTimecode('85:12:44:20'), {
    delimiter: ':',
    hours: 85,
    minutes: 12,
    seconds: 44,
    frames: 20,
    inMilliseconds: 306764020,
  })
  t.is(chaptered.hasLeadingHour, true)

  t.like(chaptered.parseTimecode('85;12;44;20'), {
    delimiter: ';',
    hours: 85,
    minutes: 12,
    seconds: 44,
    frames: 20,
    inMilliseconds: 306764020,
  })
  t.is(chaptered.hasLeadingHour, true)

  t.like(chaptered.parseTimecode('12:44:20', { hasMilliseconds: true, resetHasLeadingHour: true }), {
    delimiter: ':',
    hours: 0,
    minutes: 12,
    seconds: 44,
    frames: 20,
    inMilliseconds: 764020,
  })
  t.is(chaptered.hasLeadingHour, false)

  t.like(chaptered.parseTimecode('12;44;20', { hasMilliseconds: true, resetHasLeadingHour: true }), {
    delimiter: ';',
    hours: 0,
    minutes: 12,
    seconds: 44,
    frames: 20,
    inMilliseconds: 764020,
  })
  t.is(chaptered.hasLeadingHour, false)
})

test('formatTimeString', (t) => {
  const chaptered = new Chaptered({})

  let options = {
    format: {
      time: {
        includeLeadingHours: 'always',
        includeLeadingZeros: 'always',
        includeMilliseconds: true
      }
    }
  }
  chaptered.setOptions(options)
  t.like(chaptered.options, options)

  t.is(chaptered.formatTimeString(1101002, ':'), '00:18:21:02')
  t.is(chaptered.formatTimeString(306764020, ':'), '85:12:44:20')

  options = {
    format: {
      record:{
        time: {
          includeLeadingHours: 'never',
          includeLeadingZeros: 'never',
          includeMilliseconds: true
        }
      }
    }
  }
  chaptered.setOptions(options)
  t.like(chaptered.options, options)

  t.is(chaptered.formatTimeString(1101002, ':'), '18;21;2')

  t.is(chaptered.formatTimeString(1101002, ':'), '18:21:2')
  t.is(chaptered.formatTimeString(306764020, ':'), '85:12:44:20')

  chaptered.hasLeadingHour = true
  t.is(chaptered.formatTimeString(1101002, ':'), '18:21:2')

  chaptered.hasLeadingHour = false
  t.is(chaptered.formatTimeString(1101002, ':'), '18:21:2')

  chaptered.hasLeadingHour = true
  chaptered.options.format.record.time.includeLeadingHours = 'hasHour'
  t.is(chaptered.formatTimeString(1101002, ':'), '0:18:21:2')

  chaptered.hasLeadingHour = true
  chaptered.options.format.record.time.includeLeadingHours = 'hasHour'
  chaptered.options.format.record.time.includeLeadingZeros = 'notHour'
  t.is(chaptered.formatTimeString(1101002, ':'), '0:18:21:02')

  chaptered.hasLeadingHour = true
  chaptered.options.format.record.time.includeLeadingHours = 'hasHour'
  chaptered.options.format.record.time.includeLeadingZeros = 'never'
  t.is(chaptered.formatTimeString(1101002, ':'), '0:18:21:2')

  chaptered.hasLeadingHour = true
  chaptered.options.format.record.time.includeLeadingHours = 'hasHour'
  chaptered.options.format.record.time.includeLeadingZeros = 'always'
  t.is(chaptered.formatTimeString(1101002, ':'), '00:18:21:02')

  chaptered.hasLeadingHour = true
  chaptered.options.format.record.time.includeLeadingHours = 'hasHour'
  chaptered.options.format.record.time.includeLeadingZeros = 'always'
  t.is(chaptered.formatTimeString(1101002, '.'), '00:18:21.002')

  chaptered.hasLeadingHour = true
  chaptered.options.format.record.time.includeLeadingHours = 'hasHour'
  chaptered.options.format.record.time.includeLeadingZeros = 'always'
  chaptered.options.format.record.time.includeMilliseconds = false
  t.is(chaptered.formatTimeString(1101002, '.'), '00:18:21')
})

const chapteredAudition = new Chaptered({})
const chapteredResolve = new Chaptered({})
const chapteredPremiere = new Chaptered({})
const chapteredPremiereSemicolon = new Chaptered({})

test('load audition input', (t) => {
  chapteredAudition.setInput(contentsAudition)
  t.is(chapteredAudition.input, contentsAudition)
})
test('load resolve input', (t) => {
  chapteredResolve.setInput(contentsResolve)
  t.is(chapteredResolve.input, contentsResolve)
})
test('load premiere input', (t) => {
  chapteredPremiere.setInput(contentsPremiere)
  t.is(chapteredPremiere.input, contentsPremiere)
})
test('load premiere semicolon input', (t) => {
  chapteredPremiereSemicolon.setInput(contentsPremiereSemicolon)
  t.is(chapteredPremiereSemicolon.input, contentsPremiereSemicolon)
})

test('determin unrecognized fileType', (t) => {
  const chaptered = new Chaptered({}).setInput('xxx')
  t.is(chaptered.input, 'xxx')
  t.throws(() => chaptered.determinFiletype(), { instanceOf: Error, message: 'filetype unrecognized' })
})

test('determin audition fileType', (t) => {
  chapteredAudition.determinFiletype()
  t.is(chapteredAudition.fileType, 'audition')
})

test('determin resolve fileType', (t) => {
  chapteredResolve.determinFiletype()
  t.is(chapteredResolve.fileType, 'resolve')
})

test('determin premiere fileType', (t) => {
  chapteredPremiere.determinFiletype()
  t.is(chapteredPremiere.fileType, 'premiere')
})

test('determin premiere semicolon fileType', (t) => {
  chapteredPremiereSemicolon.determinFiletype()
  t.is(chapteredPremiereSemicolon.fileType, 'premiere')
})

test('parseCSV audition', (t) => {
  chapteredAudition.parseCSV()
  t.snapshot(chapteredAudition.records.parsed)
})

test('parseCSV resolve', (t) => {
  chapteredResolve.parseCSV()
  t.snapshot(chapteredResolve.records.parsed)
})

test('parseCSV premiere', (t) => {
  chapteredPremiere.parseCSV()
  t.snapshot(chapteredPremiere.records.parsed)
})

test('parseCSV premiere semicolon', (t) => {
  chapteredPremiereSemicolon.parseCSV()
  t.snapshot(chapteredPremiereSemicolon.records.parsed)
})

test('cleanRecords audition', (t) => {
  chapteredAudition.cleanRecords()
  // console.log('chapteredAudition.records.cleaned:', chapteredAudition.records.cleaned);
  // t.snapshot(chapteredAudition.records.cleaned)
})

test('cleanRecords resolve', (t) => {
  chapteredResolve.cleanRecords()
  // t.snapshot(chapteredResolve.records.cleaned)
})

test('cleanRecords premiere', (t) => {
  chapteredPremiere.cleanRecords()
  // t.snapshot(chapteredPremiere.records.cleaned)
})

// test('formatLines premiere', (t) => {
//   chapteredPremiere.formatLines().sort('type', 'asc')
//   // t.snapshot(chapteredPremiere.records.cleaned)
//   t.is(typeof chapteredPremiere.input, 'string')

//   console.log('')
//   // console.log(chapteredPremiere.records.cleaned.map((r) => r.line).join('\n'))
//   console.log('')
//   console.log(chapteredPremiere.output({
//     sections: false,
//   }))
// })
