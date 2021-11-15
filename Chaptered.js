import camelCase from 'camelcase'
import isEmpty from 'lodash/isEmpty.js'
import isString from 'lodash/isString.js'
import merge from 'lodash/merge.js'
import { format } from 'date-fns'
import Papa from 'papaparse'
import pupa from 'pupa'
import slugify from 'slugify'
import { unraw } from 'unraw'

/**
TODO:


Test Different Marker Formats with Interface

Make library work with `import` and `require`

In Web Interface:

- Add options for Sorting
- Add options for Sections
- Add options for time templates (dropdown and then in the script the parameters are created)
- Add option to "ignore faulty lines" (and add chaptered support for this option / aka: don't parse broken lines and just ignore that line)

- Test if I can bundle the Chaptered Library into the frontend?
  - Maybe needs webpack to be able to do that?


Add options validation (and throw errors if done wrong)

Add input validation (and throw type errors if not)

Add throw error if determinFileType fails!

Implement Tests for all kinds of things and steps of the system.
- parseCSV (check the records for results)
- cleanRecords (check for records that worked based on input)
*/

// Resolve Markers Indexed with `#` Symbol and it will be translated to `index` for use in object attributes.
slugify.extend({ '#': 'index' })

class Chaptered {
  constructor(options) {
    this.fileType = undefined
    this.records = {
      parsed: undefined,
      cleaned: undefined,
    }
    this.lastInput = ''
    this.setOptions(options)
  }

  setOptions(options) {
    const optionsDefault = {
      format: {
        output: {
          header: {
            show: true,
            template: '# Show Notes',
            locals: {}
          },
          footer: {
            show: true,
            template: 'Rendered: {date} {time}\n{poweredBy}',
            locals: {},
          },
          section: {
            sections: true,
            sectionBy: 'type',
            order: 'asc',
            headline: {
              show: true,
              template: '# Type: {title}\n',
              locals: {},
            },
          },
        },
        record: {
          time: {
            includeLeadingHours: 'always', // always | hasHour | never
            includeLeadingZeros: 'always', // always | notHour | never
            includeMilliseconds: true, // true | false
          },
          line: {
            template: '{timeIn} - {timeOut} - {timeDuration} - {type} - {title}',
            locals: {},
          },
        },
        sort: {
          sort: true,
          sortBy: 'timecode.in', // time.in | timecode.out | timecode.duration | type
          order: 'asc',
        },
      },
      locals: {
        time: format(new Date(), 'HH:mm:ss'),
        date: format(new Date(), 'yyyy-MM-dd'),
        year: format(new Date(), 'yyyy'),
        poweredBy: 'Powered by [Chaptered.app](https://Chaptered.app)',
        fileType: () => this.fileType,
      },
    }
    this.options = merge(optionsDefault, options)
    // TODO: insert validation that the options are valid?!
    return this
  }

  setInput(input) {
    this.input = input.trim()
    return this
  }

  parse(input) {
    if (new String(this.input).valueOf() === new String(input).valueOf()) return this // if the last input is exactly the same as the new input we don't have to run anything at this point
    return this.setInput(input.trim())
      .determinFiletype()
      .parseCSV()
      .cleanRecords()
  }

  determinFiletype() {
    if (this.input.startsWith('Name')) {
      this.fileType = 'audition'
    } else if (this.input.startsWith('Marker')) {
      this.fileType = 'premiere'
    } else if (this.input.startsWith('"#"')) {
      this.fileType = 'resolve'
    } else {
      this.fileType = undefined
      throw new Error('filetype unrecognized')
    }
    return this
  }

  parseCSV() {
    if (!isString(this.input) || isEmpty(this.input)) {
      throw new Error('input must be set')
    }
    if (this.fileType === undefined || this.fileType === null) {
      throw new Error('determinFiletype must be run before')
    }
    this.records.parsed = Papa.parse(this.input, {
      header: true,
      transformHeader: (column) => slugify(camelCase(column), ''),
      skipEmptyLines: true,

      // columns: (header) => header.map((column) => slugify(camelCase(column), '')),
      // delimiter: (this.fileType === 'resolve') ? ',' : '\t',
      // // eslint-disable-next-line camelcase
      // relax_column_count: true,
      // ltrim: true,
      // rtrim: true,
    })

    return this
  }

  cleanRecords() {
    this.hasLeadingHour = false

    console.log(`this.records.parsed:`, JSON.parse(JSON.stringify(this.records.parsed.data[0])))

    this.records.cleaned = this.records.parsed.data.map((record, index) => {
      record.index = index
      record = this.mapRecord(record)
      if (!isEmpty(record.timecode.in) && !isEmpty(record.timecode.out) && isEmpty(record.timecode.duration)) {
        // calculate duration / have in and out but not duration
        const milliseconds = record.timecode.out.inMilliseconds - record.timecode.in.inMilliseconds
        record.timecode.duration = this.parseTimecode(this.formatTimeString(milliseconds, record.timecode.in.delimiter))
      } else if (!isEmpty(record.timecode.in) && isEmpty(record.timecode.out) && !isEmpty(record.timecode.duration) && record.timecode.duration.inMilliseconds !== 0) {
        // calculate out / have in and duration but not out
        const milliseconds = record.timecode.in.inMilliseconds + record.timecode.duration.inMilliseconds
        record.timecode.out = this.parseTimecode(this.formatTimeString(milliseconds, record.timecode.in.delimiter))
      } else if (isEmpty(record.timecode.duration)) {
        // set duration to 00:00:00 becuase it is not set
        const milliseconds = 0
        record.timecode.duration = this.parseTimecode(this.formatTimeString(milliseconds, record.timecode.in.delimiter))
      }
      return record
    })
    return this
  }

  mapRecord(record) {
    switch (this.fileType) {
      case 'audition':
        return {
          index: record.index,
          title: record.name,
          description: record.description,
          timecode: {
            in: this.parseTimecode(record.start),
            out: undefined,
            duration: this.parseTimecode(record.duration),
            format: record.timeFormat,
          },
          type: record.type,
          raw: record,
        }
      case 'premiere':
        return {
          index: record.index,
          title: record.markerName,
          description: record.description,
          timecode: {
            in: this.parseTimecode(record.in),
            out: this.parseTimecode(record.out),
            duration: this.parseTimecode(record.duration),
          },
          type: record.markerType,
          raw: record,
        }

      case 'resolve':
        return {
          index: Number.parseInt(record.index, 10),
          title: record.notes,
          description: record.comments,
          timecode: {
            in: this.parseTimecode(record.recordIn, {resolveFloor: true}),
            out: this.parseTimecode(record.recordOut, {resolveFloor: true}),
            duration: undefined,
          },
          type: record.color,
          raw: record,
        }
      default:
        return record
    }
  }

  parseTimecode(timecode, options) {
    if (!isEmpty(timecode) && !isString(timecode)) {
      throw new Error('timecode must be a string and not empty')
    }

    const optionsDefault = {
      hasMilliseconds: false,
      resetHasLeadingHour: false,
      resolveFloor: false,
    }
    options = merge(optionsDefault, options)

    if (options.resetHasLeadingHour) this.hasLeadingHour = false

    const regexDefault = /^(?:(?<h>\d*)[:|;]){0,1}(?<m>\d{1,2})[:|;](?<s>\d{1,2})(?:(?<d>:|;|\.)(?<ms>\d{1,3})){0,1}$/i
    const regexMustHaveMilliseconds = /^(?:(?<h>\d*)[:|;]){0,1}(?<m>\d{1,2})[:|;](?<s>\d{1,2})(?:(?<d>:|;|\.)(?<ms>\d{1,3})){1}$/i
    const parts = (options.hasMilliseconds) ? regexMustHaveMilliseconds.exec(timecode) : regexDefault.exec(timecode)
    const timeParts = {}
    if (!parts) return `[timecode "${timecode}" invalid format]`
    timeParts.hours = Number.parseInt(isEmpty(parts.groups.h) ? 0 : parts.groups.h, 10)
    timeParts.minutes = Number.parseInt(parts.groups.m, 10)
    timeParts.seconds = Number.parseInt(parts.groups.s, 10)
    timeParts.delimiter = parts.groups.d
    if (timeParts.delimiter === '.') {
      timeParts.milliseconds = Number.parseInt(parts.groups.ms, 10)
    } else {
      timeParts.frames = Number.parseInt(parts.groups.ms, 10)
    }

    console.log(`timeParts:`, timeParts)

    // Resolve always shows timecodes with the hour set to 1
    if (this.fileType === 'resolve' && options.resolveFloor) timeParts.hours -= 1

    // Add everything up to the millisecond amount (frames also are used as milliseconds since it does not matter)
    timeParts.inMilliseconds = (timeParts.hours * 3600 + timeParts.minutes * 60 + timeParts.seconds) * 1000 + (timeParts.milliseconds >= 0 ? timeParts.milliseconds : timeParts.frames)

    if (timeParts.hours > 0) this.hasLeadingHour = true // this indicates that the currently analyzed set of records includes at least one entry with an hour greater than 0

    return timeParts
  }

  formatTimeString(input, delimiter) {
    // `input` can be timeParts object or integer milliseconds
    // `delimiter` should be one of ['.',';',':']
    const timeParts = Number.isInteger(input) ? this.millisecondsToTimeParts(input) : input
    if (!timeParts || !Number.isInteger(timeParts.hours)) {
      throw new Error('input must be integer in milliseconds or valid timeParts object')
    }

    // Determin which delimiter to choose (priority on the function parameter, then the timeParts delimiter value and last the '.' default)
    delimiter = delimiter || timeParts.delimiter || '.'

    const includeLeadingHours = this.options.format.record.time.includeLeadingHours
    const includeLeadingZeros = this.options.format.record.time.includeLeadingZeros
    const includeMilliseconds = this.options.format.record.time.includeMilliseconds
    const hasLeadingHour = this.hasLeadingHour // includeLeadingHour should be true if the list of timestamps includes at least one entry with an hour timestamp

    let timeString = ''
    // Hours
    if (timeParts.hours > 0 || includeLeadingHours === 'always' || (includeLeadingHours === 'hasHour' && hasLeadingHour)) {
      if (includeLeadingZeros === 'always') {
        timeString += String(timeParts.hours).padStart(2, '0')
      } else {
        timeString += String(timeParts.hours)
      }
      timeString += ':'
    }
    // Minutes
    // console.log(`includeLeadingHours:`, includeLeadingHours)
    // console.log(`includeLeadingZeros:`, includeLeadingZeros)
    // console.log(`timeString:`, timeString)
    timeString += String(timeParts.minutes).padStart((['always', 'notHour'].includes(includeLeadingZeros)) ? 2 : 0, '0')
    timeString += ':'
    // console.log(`timeString:`, timeString)
    // Seconds
    timeString += String(timeParts.seconds).padStart((['always', 'notHour'].includes(includeLeadingZeros)) ? 2 : 0, '0')
    if (includeMilliseconds) {
      // Delimiter
      timeString += delimiter
      const ms = (timeParts.milliseconds >= 0) ? timeParts.milliseconds : timeParts.frames
      // Milliseconds or Frames
      if (['always', 'notHour'].includes(includeLeadingZeros)) {
        const padding = (delimiter === '.') ? 3 : 2
        timeString += String(ms).padStart(padding, '0')
      } else {
        timeString += String(ms)
      }
    }
    return timeString
  }

  millisecondsToTimeParts(inputMilliseconds) {
    const timeParts = {}
    timeParts.hours = Math.floor(inputMilliseconds / (3600 * 1000))
    inputMilliseconds %= (3600 * 1000)
    timeParts.minutes = Math.floor(inputMilliseconds / (60 * 1000))
    inputMilliseconds %= (60 * 1000)
    timeParts.seconds = Math.floor(inputMilliseconds / (1000))
    inputMilliseconds %= (1000)
    timeParts.milliseconds = inputMilliseconds
    return timeParts
  }

  sortRecords(options) {
    options = merge(this.options.format.sort, options)
    if (![true, false].includes(options.sort)) options.sort = true
    if (options.sort === false) return this // get out of here if sorting is disabled by the options!
    if (!['timecode.in', 'timecode.out', 'timecode.duration', 'type', 'title'].includes(options.sortBy)) options.sortBy = 'timecode.in'
    if (options.order) options.order = options.order.toLowerCase()
    if (!['asc', 'desc'].includes(options.order)) options.order = 'asc'

    this.records.cleaned.sort((a, b) => {
      let valA, valB
      switch (options.sortBy) {
        case 'timecode.out':
          valA = a.timecode.out.inMilliseconds
          valB = b.timecode.out.inMilliseconds
          break

        case 'timecode.duration':
          valA = a.timecode.duration.inMilliseconds
          valB = b.timecode.duration.inMilliseconds
          break

        case 'type':
          valA = a.type.toLowerCase()
          valB = b.type.toLowerCase()
          break

        case 'title':
          valA = a.title.toLowerCase()
          valB = b.title.toLowerCase()
          break

        default:
          valA = a.timecode.in.inMilliseconds
          valB = b.timecode.in.inMilliseconds
          break
      }
      if (typeof valA === 'string' || typeof valB === 'string') {
        if (valA < valB) return -1
        else if (valA > valB) return 1
        return 0
      }
      return valA - valB
    })

    if (options.order === 'desc') {
      this.records.cleaned.reverse()
    }

    return this
  }

  formatLines() {
    this.linesOutput = ''
    this.records.cleaned.map(this.formatLine, this)
    return this
  }

  formatLine(record) {
    const lineTemplate = this.options.format.record.line.template
    record.timeIn = (!isEmpty(record.timecode.in)) ? this.formatTimeString(record.timecode.in) : ''
    record.timeOut = (!isEmpty(record.timecode.out)) ? this.formatTimeString(record.timecode.out) : ''
    record.timeDuration = (!isEmpty(record.timecode.duration)) ? this.formatTimeString(record.timecode.duration) : ''
    record.line = unraw(pupa(lineTemplate, this.locals('line', record)))
    return record
  }

  output(options) {
    if (isEmpty(this.records.cleaned)) {
      throw new Error('you can not output stuff if you do not have stuff')
    }
    options = merge(this.options.format.output, options)
    if (![true, false].includes(options.section.sections)) options.section.sections = false
    if (![true, false].includes(options.section.headline.show)) options.section.headline.show = false
    if (![true, false].includes(options.header.show)) options.header.show = false
    if (![true, false].includes(options.footer.show)) options.footer.show = false
    if (!['type'].includes(options.section.sectionBy)) options.section.sectionBy = 'type'
    options.section.order = options.section.order.toLowerCase()
    if (!['asc', 'desc'].includes(options.section.order)) options.section.order = 'asc'

    let output = (options.header.show) ? pupa(options.header.template, this.locals('header', options.header.locals)) + '\n' : ''

    const uniqBy = (arr, predicate) => {
      const cb = typeof predicate === 'function' ? predicate : (o) => o[predicate]

      return [...arr.reduce((map, item) => {
        const key = (item === null || item === undefined) ? item : cb(item)

        map.has(key) || map.set(key, item)

        return map
      }, new Map()).values()]
    }

    if (options.section.sections) {
      const sections = uniqBy(this.records.cleaned, options.section.sectionBy).map((r) => r[options.section.sectionBy])
      if (options.section.order) sections.sort()
      if (options.section.order && options.section.order === 'desc') sections.reverse()
      const outputSections = sections.map((section) => {
        let text = '\n'
        text += (options.section.headline.show) ? pupa(options.section.headline.template, {title: section.charAt(0).toUpperCase() + section.substr(1)}) : ''
        text += '\n'
        text += this.outputSection(options.section.sectionBy, section)
        return text
      })
      output += outputSections.join('\n')
    } else {
      output += '\n' + this.records.cleaned.map((r) => this.formatLine(r).line).join('\n')
    }

    output += (options.footer.show) ? '\n\n' + pupa(options.footer.template, this.locals('footer', options.footer.locals)) : ''
    output += '\n'

    return output
  }

  outputSection(sectionBy, sectionValue) {
    return this.records.cleaned.filter((r) => r[sectionBy] === sectionValue).map((r) => this.formatLine(r).line).join('\n')
  }

  locals(local, locals) {
    locals = locals || {}
    switch (local) {
      case 'header':
        return merge(this.options.locals, this.options.format.output.header.locals, locals)

      case 'footer':
        return merge(this.options.locals, this.options.format.output.footer.locals, locals)

      case 'section':
        return merge(this.options.locals, this.options.format.output.section.headline.locals, locals)

      default:
        return merge(this.options.locals, this.options.format.record.line.locals, locals)
    }
  }
}

export default Chaptered

