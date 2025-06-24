import * as path from 'path';
import { Project } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
});

const sourceFiles = project.getSourceFiles('src/**/*.ts');

const interfaces: any[] = [];
const relationships: any[] = [];

for (const file of sourceFiles) {
  for (const iface of file.getInterfaces()) {
    const name = iface.getName();
    const properties: { name: string; type: string }[] = [];

    iface.getProperties().forEach((prop) => {
      const propType = prop.getType().getText();
      const propName = prop.getName();
      properties.push({ name: propName, type: propType });

      const match = propType.match(/^I[A-Z]\w+/);
      if (match) {
        relationships.push({
          from: name,
          to: match[0],
          type: 'Ref',
        });
      }

      if (propType.startsWith('[')) {
        const arrayMatch = propType.match(/\[I[A-Z]\w+]/);
        if (arrayMatch) {
          relationships.push({
            from: name,
            to: arrayMatch[0].replace(/\[|\]/g, ''),
            type: 'RefArray',
          });
        }
      }
    });

    interfaces.push({
      name,
      filePath: file.getFilePath().replace(process.cwd(), ''),
      docs: 'Parsed from TypeScript interface',
      methods: [],
      properties, // ✅ now it's a list, not an object
    });
  }
}

const result = {
  entities: interfaces,
  relationships,
};

console.log(JSON.stringify(result, null, 2));
