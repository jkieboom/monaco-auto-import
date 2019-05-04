import * as Monaco from "monaco-editor";

import { IMPORT_COMMAND } from "./import-completion";
import ImportDb, { ImportObject } from "./import-db";

export interface Context {
  document: Monaco.editor.ITextModel;
  range: Monaco.Range;
  context: Monaco.languages.CodeActionContext;
  token: Monaco.CancellationToken;
  imports?: ImportObject[];
}

export class ImportAction implements Monaco.languages.CodeActionProvider {
  constructor(editor: Monaco.editor.IStandaloneCodeEditor, private importDb: ImportDb) {
    editor.updateOptions({
      lightbulb: {
        enabled: true
      }
    });
  }

  public provideCodeActions(
    document: Monaco.editor.ITextModel,
    range: Monaco.Range,
    context: Monaco.languages.CodeActionContext,
    token: Monaco.CancellationToken
  ): Monaco.languages.CodeAction[] {
    const actionContext = { document, range, context, token };

    if (this.canHandleAction(actionContext)) {
      return this.actionHandler(actionContext);
    }

    return [];
  }

  private canHandleAction(context: Context): boolean {
    if (!context.context.markers) {
      return false;
    }

    const [diagnostic] = context.context.markers;
    if (!diagnostic) {
      return false;
    }

    if (
      diagnostic.message.startsWith("Typescript Cannot find name") ||
      diagnostic.message.startsWith("Cannot find name")
    ) {
      const imp = diagnostic.message
        .replace("Typescript Cannot find name", "")
        .replace("Cannot find name", "")
        .replace(/{|}|from|import|'|"| |\.|;/gi, "");

      const found = this.importDb.getImports(imp);
      if (found.length) {
        context.imports = found;
        return true;
      }
    }
    return false;
  }

  private actionHandler(context: Context) {
    const path = ({ file }: ImportObject) => {
      return (file.aliases && file.aliases[0]) || file.path;
    };
    const handlers = new Array<Monaco.languages.CodeAction>();

    if (!context.imports) {
      return handlers;
    }

    context.imports.forEach((i) => {
      handlers.push({
        title: `Import '${i.name}' from module "${path(i)}"`,
        command: {
          title: "AI: Autocomplete",
          id: IMPORT_COMMAND,
          arguments: [i, context.document]
        }
      });
    });

    return handlers;
  }
}
