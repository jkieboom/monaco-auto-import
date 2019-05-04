import * as Monaco from "monaco-editor";

import { getMatches } from "./../parser/util";
import { ImportObject } from "./import-db";
import { monaco } from ".";

type Edit = Monaco.editor.IIdentifiedSingleEditOperation;

export class ImportFixer {
  private spacesBetweenBraces: boolean = true;
  private doubleQuotes: boolean = true;
  private useSemiColon: boolean = true;

  constructor(private editor: Monaco.editor.IStandaloneCodeEditor) {}

  public fix(document: Monaco.editor.ITextModel, imp: ImportObject): void {
    const edits = this.getTextEdits(document, imp);
    this.editor.executeEdits("", edits);
  }

  public getTextEdits(document: Monaco.editor.ITextModel, imp: ImportObject): Edit[] {
    const edits: Edit[] = [];

    const { importResolved, fileResolved, imports } = this.parseResolved(document, imp);

    if (importResolved) {
      return edits;
    }

    const edit = fileResolved ? this.updateImportEdit(document, imp, imports[0].path) : this.createImportEdit(imp);

    if (edit) {
      edits.push(edit);
    }

    return edits;
  }

  /**
   * Returns whether a given import has already been
   * resolved by the user
   */
  private parseResolved(document: Monaco.editor.ITextModel, imp: ImportObject) {
    const exp = imp.isImportEquals
      ? /import[ \t]+(.*)[ \t]*=[ \t]*require[ \t]*\([ \t]*['"](.*)['"]/g
      : /(?:import[ \t]+{)(.*)}[ \t]from[ \t]['"](.*)['"]/g;

    const currentDoc = document.getValue();

    const matches = getMatches(currentDoc, exp);

    const parsed = imp.isImportEquals
      ? matches.map(([_, name, path]) => ({
          names: [name],
          path
        }))
      : matches.map(([_, names, path]) => ({
          names: names.split(",").map((imp) => imp.trim().replace(/\n/g, "")),
          path
        }));

    const imports = parsed.filter(
      ({ path }) => path === imp.file.path || (imp.file.aliases && imp.file.aliases.indexOf(path) > -1)
    );

    const importResolved = imports.findIndex((i) => i.names.indexOf(imp.name) > -1) > -1;

    return { imports, importResolved, fileResolved: !!imports.length };
  }

  /**
   * Merges an import statement into the document
   */
  private updateImportEdit(document: Monaco.editor.ITextModel, imp: ImportObject, path: string): Edit | null {
    const currentDoc = document.getValue();

    if (imp.isImportEquals) {
      return null;
    }

    const exp = new RegExp(`(import[ \t]+{)([^}]*)}[ \t]*from[ \t]*['"]${path}['"])`);
    const foundImport = currentDoc.match(exp);

    if (foundImport && foundImport.index != null) {
      const startOffset = foundImport.index + foundImport[1].length;
      const importNames = foundImport[2];
      const endOffset = startOffset + importNames.length;

      const names = importNames.trim() ? importNames.split(",").map((s) => s.trim()) : [];
      names.push(imp.name);
      names.sort();

      const spaceBetween = this.spacesBetweenBraces ? " " : "";

      const startPos = document.getPositionAt(startOffset);
      const endPos = document.getPositionAt(endOffset);

      return {
        range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
        text: `${spaceBetween}${names.join(", ")}${spaceBetween}`
      };
    }

    return null;
  }

  /**
   * Adds a new import statement to the document
   */
  private createImportEdit(imp: ImportObject): Edit | null {
    const path = (imp.file.aliases && imp.file.aliases[0]) || imp.file.path;

    const quote = this.doubleQuotes ? `"` : `'`;
    const spaceBetween = this.spacesBetweenBraces ? " " : "";
    const semicolon = this.useSemiColon ? ";" : "";
    const quotedImportPath = `${quote}${path}${quote}`;

    const importLine = imp.isImportEquals
      ? `import ${imp.name} = require(${quotedImportPath})${semicolon}\n`
      : `import {${spaceBetween}${imp.name}${spaceBetween}} from ${quotedImportPath}${semicolon}\n`;

    return {
      range: new Monaco.Range(0, 0, 0, 0),
      text: importLine
    };
  }
}
