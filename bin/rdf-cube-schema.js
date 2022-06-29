#!/usr/bin/env node

const program = require('commander')
const factory = require('rdf-ext')
const fromFile = require('rdf-utils-fs/fromFile')
const toNT = require('@rdfjs/to-ntriples')
const { validateCube } = require('../validate')

async function loadDataset (filePath) {
  return factory.dataset().import(fromFile(filePath))
}

function validationResultToString (result) {
  const severity = result.severity.value.split('#')[1]
  const message = result.message.map(m => m.value).join(' ')
  const path = toNT(result.path)
  const focusNode = toNT(result.focusNode)
  const sourceConstraintComponent = result.sourceConstraintComponent.value.split('#')[1]
  const sourceShape = toNT(result.sourceShape)

  return `${severity} of ${sourceConstraintComponent}: "${message}" with path ${path} at focus node ${focusNode} (source: ${sourceShape})`
}

function includeNestedResult(result) {
  const nestedResult = Object.keys(result.detail).length ? result.detail.map(includeNestedResult).flat() : []
  return [result].concat(nestedResult).flat()
}

program
  .command('validate cube shape')
  .action(async (args, [cubeFilePath, shapeFilePath]) => {
    const cube = await loadDataset(cubeFilePath)
    const shape = await loadDataset(shapeFilePath)

    const report = await validateCube(cube, shape)

    const results = report.results.map(includeNestedResult)

    console.log(`cube validation ${report.conforms ? 'successful' : 'failed'}`)

    for (const result of results.flat()) {
      console.log('================================')
      console.dir(result, { depth: 19 })
      console.log(`path: ${toNT(result.path)}`)
      console.log(`focusNode: ${toNT(result.focusNode)}`)
      console.log(validationResultToString(result))
    }

    process.exit(report.conforms ? 0 : 1)
  })

program.parse(process.argv)
