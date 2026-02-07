/**
 * Типы токенов для DSL парсера (объект для совместимости с erasableSyntaxOnly)
 */
export const TokenType = {
  PROPERTY: 'PROPERTY',
  VALUE: 'VALUE',
  COLON: 'COLON',
  SEMICOLON: 'SEMICOLON',
  DOT: 'DOT',
  COMMENT: 'COMMENT',
  INTERPOLATION: 'INTERPOLATION',
  VARIABLE: 'VARIABLE',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  EOF: 'EOF'
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

/**
 * Токен DSL
 */
export interface DSLToken {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Путь к свойству (например, "options.scales.x.grid.display")
 */
export type PropertyPath = string;

/**
 * Результат разбора вызова функции в DSL (например rest("url"))
 */
export interface FunctionCallValue {
  type: 'function';
  name: string;
  args: (string | number)[];
}

/**
 * Значение свойства
 */
export type PropertyValue = 
  | string 
  | number 
  | boolean 
  | Array<string | number>
  | ((props?: unknown) => unknown)
  | FunctionCallValue;

/**
 * Узел AST для свойства
 */
export interface PropertyNode {
  type: 'property';
  path: PropertyPath;
  value: PropertyValue;
  line: number;
  column: number;
}

/**
 * Узел AST для комментария
 */
export interface CommentNode {
  type: 'comment';
  value: string;
  line: number;
}

/**
 * Узел AST для интерполяции
 */
export interface InterpolationNode {
  type: 'interpolation';
  expression: string;
  line: number;
  column: number;
}

/**
 * Тип узла AST
 */
export type ASTNode = PropertyNode | CommentNode | InterpolationNode;

/**
 * AST дерево
 */
export interface AST {
  nodes: ASTNode[];
  metadata?: {
    source?: string | FunctionCallValue;
    extends?: string;
    map?: Record<string, string>;
  };
}

/**
 * Результат парсинга DSL
 */
export interface ParsedDSL {
  ast: AST;
  config: Record<string, unknown>;
  errors: ParseError[];
}

/**
 * Ошибка парсинга
 */
export interface ParseError {
  message: string;
  line: number;
  column: number;
  code: string;
}
