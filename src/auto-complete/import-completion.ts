import * as Monaco from "monaco-editor";

import ImportDb, { ImportObject } from "./import-db";
import { ImportFixer } from "./import-fixer";
import kindResolver from "./util/kind-resolution";

export const IMPORT_COMMAND = "resolveImport";

class ImportCompletion implements Monaco.languages.CompletionItemProvider {
  constructor(private editor: Monaco.editor.IStandaloneCodeEditor, private importDb: ImportDb) {
    // TODO: Add typings / find public API
    const cs = (editor as any)._commandService;

    // Register the resolveImport
    cs.addCommand({
      id: IMPORT_COMMAND,
      handler: (_: any, imp: ImportObject, document: Monaco.editor.ITextModel) => this.handleCommand(imp, document)
    });
  }

  /**
   * Handles a command sent by monaco, when the
   * suggestion has been selected
   */
  public handleCommand(imp: ImportObject, document: Monaco.editor.ITextModel) {
    new ImportFixer(this.editor).fix(document, imp);
  }

  public provideCompletionItems(
    document: Monaco.editor.ITextModel
  ): Monaco.languages.ProviderResult<Monaco.languages.CompletionList> {
    const imports = this.importDb.all();

    return { suggestions: imports.map((i) => this.buildCompletionItem(i, document)) };
  }

  private buildCompletionItem(imp: ImportObject, document: Monaco.editor.ITextModel): Monaco.languages.CompletionItem {
    const path = this.createDescription(imp);

    return {
      label: imp.name,
      kind: kindResolver(imp),
      detail: `Auto import from '${path}'\n${imp.type} ${imp.name}`,
      insertText: imp.name,
      command: {
        title: "AI: Autocomplete",
        id: IMPORT_COMMAND,
        arguments: [imp, document]
      }
    };
  }

  private createDescription({ file }: ImportObject) {
    return (file.aliases && file.aliases[0]) || file.path;
  }
}

export default ImportCompletion;
