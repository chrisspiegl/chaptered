# Marker Converter (Working Title)


## DONE

### 2020-11-17 - https://youtu.be/m9ogV8hoM2U

- Read Marker Files Content into Script
- Extract Type of Mareker File (`premiere`, `audition`, `resolve`)
- Request Different Fromats (`detailed`, `shownotes`)
- Read values from CSV files (tab or comma separated)
- Map values into one common object format
    + While mapping, also convert timecode depending on output format
    + This should be done upon output in later versions
- Output an array of lines in either one or the other format
- Join those with new lines, and output the transformed text content to the console

## TODO LIST

- Make the markconvert a class with options
- Make it so that the formatting can be done after everything is already read
- Make it so that the `Marker Types` are collected in an array for use in the interface and filtering
- Make it so that certain settings can be read by the outside world
    + Marker Source Program
    + Marker Types
    + Time Format
    + With this information the interface than can change accordingly and provide buttons for certain settings or disable them.
- Make Filter Settings Available (and use them upon creating the output lines)

### Alfred Workflow

1. Version that reads the file from the `File Action`
2. Try to give different options upon calling "Reformat File" in File Actions.
    - Alternative, offer different output formats and filters that I can setup in Alfred and by setting certain process.args in the call…
3. Also try to ask for delivery option:
    - copy to clipboard
    - update file and rename (post-fix / pre-fix / file extension)
    - update file content without rename
    - create new file with new name (post-fix / pre-fix)

### Webinterface

Basic interface to paste markers => read into engine => displaid on text form next to source => buttons above give options for filters & output format => update output on button click => copy to clipboard button

- File Ingest
    + Paste into Text Field
    + Upload File via File Browser

## How to Export Markers as JSON File in Different Programs

### Premire Pro Export Markers as JSON File

_TK_

### Audition Export Markers as JSON File

_TK_

### Resolve Export Markers as JSON File

This is how you get the Edit Index with the Markers you set in JSON format:

1. Edit Index: Select from `…` the option to `Show Markers` and select either `Show All` or the color you want.
2. Media Pool: Select the Timeline you want to export, right click, `Timeline` followed by `Export` followed by `Edit Index`

### Resolve Export Markers as EDL File

1. Media Pool: Select the Timeline you want to export, right click, `Timeline` followed by `Export` followed by `Export as EDL`