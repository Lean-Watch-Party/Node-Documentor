import * as path from 'path';
import { Project, SourceFile, SyntaxKind, Type } from 'ts-morph';

export function generateApiDoc(projectPath: string): any[] {
  const project = new Project({
    tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: false,
  });

  // ✅ Force load DTOs
  project.addSourceFilesAtPaths(path.join(projectPath, 'src/**/*.ts'));

  const sourceFiles = project.getSourceFiles(
    path.join(projectPath, 'src/**/*.ts'),
  );

  const httpMethods = ['Get', 'Post', 'Put', 'Delete', 'Patch'];
  const controllers: any[] = [];

  sourceFiles.forEach((file) => {
    const controllerClass = file
      .getClasses()
      .find((cls) =>
        cls.getDecorators().some((d) => d.getName() === 'Controller'),
      );
    if (!controllerClass) return;

    const baseRoute =
      controllerClass
        .getDecorator('Controller')
        ?.getArguments()[0]
        ?.getText()
        ?.replace(/['"]/g, '') || '';

    controllerClass.getMethods().forEach((method) => {
      const routeDecorator = method
        .getDecorators()
        .find((d) => httpMethods.includes(d.getName()));
      if (!routeDecorator) return;

      const httpMethod = routeDecorator.getName().toUpperCase();
      const route =
        routeDecorator.getArguments()[0]?.getText().replace(/['"]/g, '') || '';

      const fullRoute = `${httpMethod} ${baseRoute}${route.startsWith('/') ? '' : '/'}${route}`;
      const methodName = method.getName();

      const requestParams: Record<string, any> = {};

      method.getParameters().forEach((param) => {
        const decorator = param.getDecorators()[0];
        if (!decorator) return;

        const decoratorName = decorator.getName(); // Body, Param, Query, etc.
        const type = param.getType();
        const resolved = extractTypeFieldsByType(project, type);

        if (resolved) {
          requestParams[decoratorName.toLowerCase()] = resolved;
        } else {
          requestParams[decoratorName.toLowerCase()] = {
            name: param.getName(),
            type: type.getText(),
          };
        }
      });

      const returnType = method.getReturnType();
      const unwrapped = returnType.getTypeArguments()?.[0] || returnType;
      const responseDto = extractTypeFieldsByType(project, unwrapped);

      controllers.push({
        controller: controllerClass.getName(),
        route: fullRoute,
        methodName,
        requestParams,
        responseDto,
      });
    });
  });

  return controllers;
}

function extractTypeFieldsByType(
  project: Project,
  type: Type,
  visitedTypes = new Set<string>(),
): any | null {
  const typeText = type.getText();
  const symbol = type.getSymbol();
  const typeName = symbol?.getName() ?? typeText;

  if (visitedTypes.has(typeText)) {
    return { name: typeName, fields: '[Circular Reference]' };
  }

  visitedTypes.add(typeText);

  if (
    type.isString() ||
    type.isNumber() ||
    type.isBoolean() ||
    type.isUndefined() ||
    type.isNull() ||
    type.isVoid() ||
    type.getSymbol()?.getName() === 'File' ||
    type.getText().includes('Express.') ||
    type.getText().startsWith('import("node:')
  ) {
    return null;
  }

  if (type.isUnion()) {
    const unionType = type.getUnionTypes().find((t) => t.getSymbol());
    return unionType
      ? extractTypeFieldsByType(project, unionType, visitedTypes)
      : null;
  }

  if (type.isArray()) {
    const elem = type.getArrayElementTypeOrThrow();
    const sub = extractTypeFieldsByType(project, elem, visitedTypes);
    return sub ? { ...sub, isArray: true } : null;
  }

  if (type.getTypeArguments().length > 0) {
    const inner = type.getTypeArguments()[0];
    return extractTypeFieldsByType(project, inner, visitedTypes);
  }

  const declaration = symbol?.getDeclarations()?.[0];
  let classDecl =
    declaration?.getParentIfKind(SyntaxKind.ClassDeclaration) ||
    declaration?.getParentIfKind(SyntaxKind.InterfaceDeclaration);

  if (!classDecl && typeText.includes('import(')) {
    const imported = getTypeFromImportText(project, typeText);
    if (imported) {
      const { file, typeName } = imported;
      const node = file.getClass(typeName) || file.getInterface(typeName);
      if (node) classDecl = node;
    }
  }

  if (!classDecl) {
    console.warn('[WARN] Could not resolve DTO:', typeText);
    return null;
  }

  const fields: Record<string, any> = {};
  classDecl.getProperties().forEach((prop) => {
    const name = prop.getName();
    const propType = prop.getType();
    const nested = extractTypeFieldsByType(
      project,
      propType,
      new Set(visitedTypes),
    );

    fields[name] = nested?.fields ? nested : propType.getText();
  });

  return {
    name: classDecl.getName() || typeText,
    fields,
  };
}

function getTypeFromImportText(
  project: Project,
  typeText: string,
): { file: SourceFile; typeName: string } | null {
  const match = typeText.match(/import\(["'](.+?)["']\)\.(\w+)/);
  if (!match) return null;

  const [_, importPath, typeName] = match;

  // Convert relative TypeScript import path to real file system path
  let resolvedPath = path.resolve(importPath);
  if (!resolvedPath.endsWith('.ts')) resolvedPath += '.ts';

  let sourceFile = project.getSourceFile(resolvedPath);
  if (!sourceFile) {
    try {
      sourceFile = project.addSourceFileAtPath(resolvedPath);
    } catch (e) {
      console.warn('[WARN] Could not load source file:', resolvedPath);
      return null;
    }
  }

  return { file: sourceFile, typeName };
}
