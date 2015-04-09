import request from 'request'
import parser from 'xml2json'
import fs from 'fs'
import path from 'path'

export default function (gulp) {
  gulp.task('update-xml', () =>
    request.get('http://techpatterns.com/downloads/firefox/useragentswitcher.xml', onget)
  )

  function onget(error, response, body) {
    if (error || response.statusCode != 200) return

    let write = fs.writeFileSync
    write(`${__dirname}/source.xml`, body)
  }

  gulp.task('w', () => {
    var src = path.join(__dirname, './src')
    gulp.watch(`${src}/useragents.xml`, ['build', 'xml2json'])
  })

  gulp.task('xml2json', () => {
    var src = path.join(__dirname, './src')
      , index = `${src}/index.js`
      , xml = fs.readFileSync(`${src}/useragents.xml`)
      , json = JSON.parse(parser.toJson(xml))
      , data = cleanupData(json.useragentswitcher.folder)

    data = stringify(data)
    saveToFile(data, index)
  })
}

function stringify(source, depth) {
  depth = depth || 1
  var lines = []
    , isObj = typeof source == 'object'
    , isArray = source instanceof Array

  function indent(depth) {
    return new Array(depth).join('  ')
  }

  function add(val) {
    lines.push(val)
  }

  if (isArray) {
    add('[')
    for (var i = 0; i < source.length; i++) {
      let comma = (i + 1 == source.length) ? '' : ','
        , value = stringify(source[i], depth+1)

      add(indent(depth+1) + value + comma)
    }
    add(indent(depth) + ']')
  } else if (isObj) {
    add('{')
    let sourceLength = 0
    for (var i in source) sourceLength++

    let length = 0
    for (var i in source) {
      length++
      let value = stringify(source[i], depth+1)
        , comma = length == sourceLength ? '' : ','
      add(indent(depth+1) + `'${i}': ${value}${comma}`)
    }
    add(indent(depth) + '}')
  } else {
    lines = ''
    lines += (typeof source == 'string') ? `'${source}'` : source
  }

  return  lines instanceof Array ? lines.join('\n') : lines
}

function saveToFile(data, filename) {
  let write = fs.writeFileSync
  write(`${filename}`,
    brake([
      "/**",
      " * DON'T EDIT THIS FILE",
      " * It's automatically generated",
      " * Run 'gulp ua' to update it",
      " * Kudos to awesome @chrispederick from chrispederick.com",
      " * XML Source: http://techpatterns.com/downloads/firefox/useragentswitcher.xml",
      " * ",
      " */",
      "",
      "export default " + data
    ])
  )
  function brake(lines) {
    return lines.join('\n')
  }
}

function cleanupData(groups) {
  let result = {}
    , allowedGroups = {
      'Browsers - Windows': {
        name: 'windows',
        type: 'desktop'
      },
      'Browsers - Mac': {
        name: 'mac',
        type: 'desktop'
      },
      'Browsers - Linux': {
        name: 'linux',
        type: 'desktop'
      },
      'Browsers - Unix': {
        name: 'linux',
        type: 'desktop'
      }
    }
    //, 'Mobile Devices', 'Spiders - Search']

  groups.forEach(processGroup)
  return result

  function processGroup(group) {
    let name = group.description
      , uaList = group.useragent
      , os = allowedGroups[name]
      , browsers = {}
    if (!os) return
    uaList.forEach(processBrowser)
    result[name] = browsers


    function processBrowser(browser) {
      let ua = browser.useragent
        , description = browser.description.toLowerCase()
        , getNameAndVersion = /(\w+).*?(\d.*)$/
        , match = description.match(getNameAndVersion)

      browsers[ua] = {
        browser: match[1],
        os: os.name,
        version: parseFloat(match[2]),
        type: os.type
      }
    }
  }
}

