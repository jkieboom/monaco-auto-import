import { Expression } from "../parser";

type Name = string;
type Path = string;

export interface Import {
  name: Name;
  type: Expression;
  isImportEquals: boolean;
}

export interface ImportObject extends Import {
  file: File;
}

export interface File {
  path: Path;
  aliases?: Path[];

  imports?: Import[];
}

type ImportMatcher = (imp: Import) => boolean;
const isAnImport = (name: string | ImportMatcher, file: File) => {
  const matcher = typeof name === "function" ? name : (i: Import) => i.name.indexOf(name) > -1;

  return file.imports ? file.imports.findIndex(matcher) > -1 : false;
};

class ImportDb {
  public files = new Array<File>();

  /**
   * Returns the total amount of files in the store
   */
  public get size() {
    return this.files.length;
  }

  /**
   * Returns all the imports from the store
   */
  public all() {
    const imports = new Array<ImportObject>();

    this.files.forEach((file) => {
      file.imports &&
        file.imports.forEach((imp) =>
          imports.push({
            ...imp,
            file
          })
        );
    });

    return imports;
  }

  /**
   * Fetches an import from the store
   * @argument name The import name to get
   * @argument fileMatcher (optional) custom function to filter the files
   */
  public getImports(
    name: Name | ImportMatcher,
    fileMatcher: (file: File) => boolean = (f) => isAnImport(name, f)
  ): ImportObject[] {
    const files = this.files.filter(fileMatcher);

    const importMatcher: ImportMatcher = typeof name === "function" ? name : (i) => i.name === name;

    const imports: ImportObject[] = [];

    for (const file of files) {
      if (!file.imports) {
        continue;
      }

      const fileImport = file.imports.find(importMatcher);

      if (!fileImport) {
        continue;
      }

      imports.push({ ...fileImport, file });
    }

    return imports;
  }

  /**
   * Save a file to the store
   * @param file The file to save
   */
  public saveFile(file: File) {
    const data: File = {
      imports: [],
      aliases: [],
      ...file
    };

    const index = this.files.findIndex((f) => f.path === data.path);

    if (index === -1) {
      this.files.push(data);
    } else {
      this.files[index] = data;
    }
  }

  /**
   * Bulk save files to the store
   * @param files The files to save
   */
  public saveFiles(files: File[]) {
    files.forEach((file) => this.saveFile(file));
  }

  /**
   * Fetches a file by it's path or alias
   * @param path The path to find
   */
  public getFile(path: Path) {
    const file = this.files.find((f) => f.path === path || (f.aliases ? f.aliases.indexOf(path) > -1 : false));

    return file;
  }

  /**
   * Adds an import to a file
   * @param path The path / alias of the file to update
   * @param name The import name to add
   * @param type The import type
   */
  public addImport(path: Path, name: Name, type: Expression = "any", isImportEquals: boolean = false) {
    const file = this.getFile(path);

    if (file) {
      const exists = isAnImport(name, file);
      if (!exists) {
        if (!file.imports) {
          file.imports = [];
        }

        file.imports.push({
          name,
          type,
          isImportEquals
        });
      }
    }

    return !!file;
  }

  /**
   * Removes an import from a file
   * @param path The path / alias of the file to update
   * @param name The import name to remove
   */
  public removeImport(path: Path, name: Name) {
    const file = this.getFile(path);

    if (file) {
      if (!file.imports) {
        file.imports = [];
      }

      const index = file.imports.findIndex((i) => i.name === name);
      if (index !== -1) {
        file.imports.splice(index, 1);
      }
    }

    return !!file;
  }
}

export default ImportDb;
