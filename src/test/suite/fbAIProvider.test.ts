import * as assert from 'assert'
import { FBAIProvider } from '../../extension/fbAIProvider'
import path from 'path'

// We test the static getFullPrompt
// Behavior expected:
// - If no fai.extends -> returns prompt unchanged
// - If extends single prompt -> prepends extended content + '\n' + own content
// - If extends array -> resolved in order of array, each separated by '\n', handling nested extends
// - Avoids circular references and duplicate inclusion

suite('FBAIProvider.getFullPrompt', () => {
  const getFullPrompt = FBAIProvider.getFullPrompt // (FBAIProvider as any).getFullPrompt as (p: any, added: Set<string>, all: any[]) => any

  test('returns prompt unchanged when no extends', () => {
    const p = { name: 'base', content: 'BASE', data: {} }
    const res = getFullPrompt(p, new Set(), [p])
    assert.deepStrictEqual(res, p)
  })

  test('prepends single extended prompt content', () => {
    const a = { name: 'a', content: 'AAA', data: {} }
    const b = { name: 'b', content: 'BBB', data: { 'fai.extends':'a' } }
    const res = getFullPrompt(b, new Set(), [a, b])
    assert.ok(res.content.includes('AAA'),`res=${JSON.stringify(res)}`)
    assert.ok(res.content.includes('BBB'))
    assert.ok(res.content.indexOf('AAA') <= res.content.indexOf('BBB'))
  })

  test('handles multiple extends with order and nesting', () => {
    const a = { name: 'a', content: 'A', data: {} }
    const b = { name: 'b', content: 'B', data: { 'fai.extends': 'a' } }
    const c = { name: 'c', content: 'C', data: { 'fai.extends': ['a', 'b'] } }
    const res = getFullPrompt(c, new Set(), [a, b, c])
    const matchesA = res.content.match(/A/g) || []
    assert.strictEqual(matchesA.length, 1, `A appears more or less than once (${matchesA.length})`)
    assert.ok(res.content.startsWith('A'), JSON.stringify(res))
    assert.ok(res.content.includes('B'))
    assert.ok(res.content.endsWith('C'))
  })

  test('handles multiple extends with other order and nesting', () => {
    const a = { name: 'a', content: 'A', data: {} }
    const b = { name: 'b', content: 'B', data: { 'fai.extends': 'a' } }
    const c = { name: 'c', content: 'C', data: { 'fai.extends': ['b', 'a'] } }
    const res = getFullPrompt(c, new Set(), [a, b, c])
    const matchesA = res.content.match(/A/g) || []
    assert.strictEqual(matchesA.length, 1, `A appears more or less than once (${matchesA.length})`)
    assert.ok(res.content.startsWith('A'), JSON.stringify(res))
    assert.ok(res.content.includes('B'))
    assert.ok(res.content.endsWith('C'))
  })

  test('avoids circular references', () => {
    const a = { name: 'a', content: 'A', data: { 'fai.extends': 'b' } }
    const b = { name: 'b', content: 'B', data: { 'fai.extends': 'a' } }
    const resA = getFullPrompt(a, new Set(), [a, b])
    const countA = (resA.content.match(/A/g) || []).length
    const countB = (resA.content.match(/B/g) || []).length
    assert.strictEqual(countA , 1, `A appears more than once (${countA}) due to circular ref`)
    assert.strictEqual(countB , 1, `B appears more than once (${countB}) due to circular ref`)
    // we dont check order here as its kind of undefined
  })

  test('handles non-existing extended prompt gracefully', () => {
    const a = { name: 'a', content: 'A', data: { 'fai.extends': 'non-existing' } }
    const resA = getFullPrompt(a, new Set(), [a])
    assert.ok(resA.content.includes("Error: Unknown prompt 'non-existing'"), `res=${JSON.stringify(resA)}`)
  })
})

suite('FBAIProvider.getPromptFiles', ()=>{
  test('contains at least analyse prompt',()=>{
    const log = console as any
    const prompts = FBAIProvider.getPromptFilesFromDirs(log, [])
    const names = prompts.map(p=>p.name)
    assert.ok(names.includes('analyse'),`prompts=${names.join(',')}`)
  })

  test('can extend analyse prompt',()=>{
    const log = console as any
    const prompts = FBAIProvider.getPromptFilesFromDirs(log, [path.resolve(process.cwd(), 'src', 'test')])
    assert.ok(prompts.length>=2,`should have found at least 2 prompts, found only ${prompts.length}`)
    // assert analyse and testPrompt present:
    const names = prompts.map(p=>p.name)
    assert.ok(names.includes('analyse'),`prompts=${names.join(',')}`)
    assert.ok(names.includes('test_cmd1'),`prompts=${names.join(',')}`)
    const analyse = prompts.find(p=>p.name==='analyse')!
    const test_cmd1 = prompts.find(p=>p.name==='test_cmd1')!
    assert.ok(test_cmd1.content.endsWith('End of test_cmd1.prompt.md\n'),`test_cmd1 prompt doesn't end correctly, content=${test_cmd1.content}`)
    assert.ok(test_cmd1.content.includes(analyse.content),`test_cmd1 prompt does not include extended content, content=${test_cmd1.content}, data=${JSON.stringify(test_cmd1.data)}`)
  })
})
