import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

// Substitui apenas as dependências externas; executa o código TypeScript do projeto.
export function carregarModulo(arquivo, imports = {}, globals = {}) {
  const testModule = { exports: {} }
  const { outputText } = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  runInNewContext(outputText, {
    module: testModule,
    exports: testModule.exports,
    require: (nome) => {
      assert.ok(nome in imports, `Import não configurado: ${nome}`)
      return imports[nome]
    },
    AbortSignal, URL, URLSearchParams, Error, setTimeout, clearTimeout,
    ...globals,
  }, { filename: arquivo })
  return testModule.exports
}
