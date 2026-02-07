import type { ASTNode, PropertyNode, CommentNode, InterpolationNode, AST } from '../types/dsl';
import type { PropertyValue } from '../types/dsl';

/**
 * Утилиты для работы с AST
 */
export class ASTBuilder {
  /**
   * Создать узел свойства
   */
  static createPropertyNode(
    path: string,
    value: PropertyValue,
    line: number,
    column: number
  ): PropertyNode {
    return {
      type: 'property',
      path,
      value,
      line,
      column
    };
  }

  /**
   * Создать узел комментария
   */
  static createCommentNode(value: string, line: number): CommentNode {
    return {
      type: 'comment',
      value,
      line
    };
  }

  /**
   * Создать узел интерполяции
   */
  static createInterpolationNode(
    expression: string,
    line: number,
    column: number
  ): InterpolationNode {
    return {
      type: 'interpolation',
      expression,
      line,
      column
    };
  }

  /**
   * Создать AST дерево
   */
  static createAST(nodes: ASTNode[], metadata?: AST['metadata']): AST {
    return {
      nodes,
      metadata
    };
  }

  /**
   * Найти все узлы свойств в AST
   */
  static findPropertyNodes(ast: AST): PropertyNode[] {
    return ast.nodes.filter(
      (node): node is PropertyNode => node.type === 'property'
    );
  }

  /**
   * Найти узел свойства по пути
   */
  static findPropertyByPath(ast: AST, path: string): PropertyNode | undefined {
    return this.findPropertyNodes(ast).find(node => node.path === path);
  }
}
