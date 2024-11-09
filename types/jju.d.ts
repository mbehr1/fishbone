// based on doc from https://github.com/rlidwka/jju
declare module 'jju' {
  function parse(text: string, options?: object): any
  function stringify(value: any, options?: object, indent?: number): string

  export interface Token {
    raw: string
    type: 'whitespace' | 'comment' | 'key' | 'literal' | 'separator' | 'newline'
    stack: (number | string)[]
    value: string
  }

  function tokenize(text: string, options?: object): Token[]
  function analyse(text: string, options?: object): any
  function update(text: string, new_value: any, options?: object): string
}
