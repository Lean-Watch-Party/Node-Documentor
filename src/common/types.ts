// src/common/types.ts

export interface MethodInfo {
  name: string;
  docs: string; // Contains signature, inputs, outputs
}

export interface PropertyInfo {
  name: string;
  type: string;
  decorators: string[];
}

export interface ClassInfo {
  name: string | undefined;
  filePath: string;
  docs: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
}

export interface FunctionInfo {
  name: string;
  method: string; // e.g., GET, POST
  route: string; // e.g., /users/:id
  docs: string; // e.g., Input: (...), Output: ...
  returnType: string;
}

// The complete parsed data from any analyzer
export interface ParsedProjectData {
  entities: ClassInfo[];
  classes: ClassInfo[];
  functions: FunctionInfo[];
  relationships?: EntityRelationship[]; // ✅ Optional support
}

// Data needed to build the ERD
export interface EntityRelationship {
  from: string;
  to: string;
  type: 'OneToOne' | 'OneToMany' | 'ManyToOne' | 'ManyToMany';
}
