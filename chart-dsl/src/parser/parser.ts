import { Lexer } from './lexer';
import { ASTBuilder } from './ast';
import { TokenType } from '../types/dsl';
import type {
  DSLToken,
  AST,
  ASTNode,
  PropertyNode,
  CommentNode,
  ParsedDSL,
  ParseError,
  PropertyValue,
  FunctionCallValue
} from '../types/dsl';

/**
 * Парсер DSL синтаксиса
 */
export class Parser {
  private tokens: DSLToken[] = [];
  private position: number = 0;
  private errors: ParseError[] = [];

  /**
   * Парсить DSL строку
   */
  parse(input: string, interpolations: unknown[] = []): ParsedDSL {
    const lexer = new Lexer(input);
    this.tokens = lexer.tokenize();
    this.position = 0;
    this.errors = [];

    const nodes: ASTNode[] = [];
    const metadata: NonNullable<AST['metadata']> = {};
    const config: Record<string, unknown> = {};

    while (!this.isEOF()) {
      try {
        // Пропустить комментарии (но сохранить в AST)
        if (this.currentToken().type === TokenType.COMMENT) {
          const comment = this.consumeComment();
          nodes.push(comment);
          continue;
        }

        // Парсить свойство
        if (this.currentToken().type === TokenType.PROPERTY) {
          const property = this.parseProperty(interpolations);
          if (property) {
            nodes.push(property);
            this.setConfigValue(config, property.path, property.value);
          }
          continue;
        }

        // Пропустить неизвестные токены
        this.advance();
      } catch (error) {
        const err = error as Error;
        this.errors.push({
          message: err.message,
          line: this.currentToken().line,
          column: this.currentToken().column,
          code: 'PARSE_ERROR'
        });
        this.advance();
      }
    }

    // Извлечь метаданные
    this.extractMetadata(config, metadata);

    const ast: AST = ASTBuilder.createAST(nodes, metadata);

    return {
      ast,
      config,
      errors: this.errors
    };
  }

  /**
   * Парсить свойство
   */
  private parseProperty(interpolations: unknown[]): PropertyNode | null {
    const path = this.parsePropertyPath();
    
    if (!this.expect(TokenType.COLON)) {
      return null;
    }

    // Пропустить комментарии перед значением
    while (!this.isEOF() && this.currentToken().type === TokenType.COMMENT) {
      this.consumeComment();
    }

    const value = this.parseValue(interpolations);
    
    // Если значение null (комментарий), пропустить это свойство
    if (value === null) {
      // Пропустить точку с запятой, если есть
      this.expect(TokenType.SEMICOLON);
      return null;
    }
    
    if (!this.expect(TokenType.SEMICOLON)) {
      // Попробуем продолжить, даже если нет точки с запятой
    }

    return ASTBuilder.createPropertyNode(
      path,
      value,
      this.currentToken().line,
      this.currentToken().column
    );
  }

  /**
   * Парсить путь свойства (например, "options.scales.x.grid.display")
   */
  private parsePropertyPath(): string {
    const parts: string[] = [];

    if (this.currentToken().type === TokenType.PROPERTY) {
      parts.push(this.currentToken().value);
      this.advance();

      while (this.currentToken().type === TokenType.DOT) {
        this.advance();
        if (this.currentToken().type === TokenType.PROPERTY) {
          parts.push(this.currentToken().value);
          this.advance();
        } else {
          throw new Error('Expected property name after dot');
        }
      }
    }

    return parts.join('.');
  }

  /**
   * Парсить значение
   */
  private parseValue(_interpolations: unknown[]): PropertyValue | null {
    const token = this.currentToken();

    // Пропустить комментарии - они не могут быть значениями
    if (token.type === TokenType.COMMENT) {
      this.advance();
      return null; // Комментарий не является значением
    }

    // Проверить вызов функции (например, rest("..."))
    if (token.type === TokenType.PROPERTY) {
      const funcName = token.value;
      this.advance();
      
      // Если следующий токен - открывающая скобка, это вызов функции
      if (!this.isEOF() && this.currentToken().type === TokenType.LPAREN) {
        return this.parseFunctionCall(funcName);
      }
      
      // Иначе это просто значение без кавычек
      return funcName;
    }

    switch (token.type) {
      case TokenType.STRING:
        this.advance();
        return token.value;

      case TokenType.NUMBER: {
        this.advance();
        const num = parseFloat(token.value);
        return isNaN(num) ? token.value : num;
      }

      case TokenType.BOOLEAN:
        this.advance();
        return token.value === 'true';

      case TokenType.VARIABLE: {
        // Проверить, является ли это JSONPath выражением ($.xxx)
        // НЕ продвигать позицию пока не проверим следующий токен
        if (this.position + 1 < this.tokens.length && this.tokens[this.position + 1].type === TokenType.DOT) {
          // Это JSONPath выражение - собрать полный путь
          this.advance(); // Пропустить VARIABLE
          this.advance(); // Пропустить DOT
          const pathParts: string[] = [token.value]; // Начинаем с "$"
          
          // Собрать все части пути после точки
          while (!this.isEOF() && this.currentToken().type === TokenType.PROPERTY) {
            pathParts.push(this.currentToken().value);
            this.advance();
            
            // Если следующая точка, продолжить собирать путь
            if (!this.isEOF() && this.currentToken().type === TokenType.DOT) {
              this.advance();
            } else {
              break;
            }
          }
          
          return pathParts.join('.');
        }
        this.advance(); // Пропустить VARIABLE
        return token.value; // Вернем как есть, resolver заменит
      }

      case TokenType.INTERPOLATION:
        this.advance();
        try {
          const func = new Function('props', `return ${token.value}`) as (props?: unknown) => unknown;
          return func;
        } catch {
          return token.value;
        }

      default:
        throw new Error(`Unexpected token type: ${token.type}`);
    }
  }

  /**
   * Парсить вызов функции (например, rest("..."))
   */
  private parseFunctionCall(funcName: string): FunctionCallValue {
    // Пропустить открывающую скобку
    if (!this.expect(TokenType.LPAREN)) {
      throw new Error(`Expected '(' after function name "${funcName}"`);
    }

    // Прочитать аргументы (пока поддерживаем только один строковый аргумент)
    const args: (string | number)[] = [];
    
    while (!this.isEOF() && this.currentToken().type !== TokenType.RPAREN) {
      if (this.currentToken().type === TokenType.STRING) {
        args.push(this.currentToken().value);
        this.advance();
      } else if (this.currentToken().type === TokenType.NUMBER) {
        const num = parseFloat(this.currentToken().value);
        args.push(isNaN(num) ? this.currentToken().value : num);
        this.advance();
      } else {
        // Пропустить неизвестные токены между аргументами
        this.advance();
      }
      
      // Пропустить запятую, если есть
      if (this.currentToken().type === TokenType.RPAREN) {
        break;
      }
    }

    // Пропустить закрывающую скобку
    if (!this.expect(TokenType.RPAREN)) {
      throw new Error(`Expected ')' after function arguments`);
    }

    // Вернуть объект вызова функции
    return {
      type: 'function',
      name: funcName,
      args
    };
  }

  /**
   * Парсить комментарий
   */
  private consumeComment(): CommentNode {
    const token = this.currentToken();
    this.advance();
    return ASTBuilder.createCommentNode(token.value, token.line);
  }

  /**
   * Извлечь метаданные из конфига
   */
  private extractMetadata(
    config: Record<string, unknown>,
    metadata: NonNullable<AST['metadata']>
  ): void {
    if (config.source != null && typeof config.source === 'string') {
      metadata.source = config.source;
    }
    if (config.extends != null && typeof config.extends === 'string') {
      metadata.extends = config.extends;
    }
    if (config.map != null && typeof config.map === 'object' && config.map !== null && !Array.isArray(config.map)) {
      metadata.map = config.map as Record<string, string>;
    }
  }

  /**
   * Установить значение в конфиг по пути
   */
  private setConfigValue(
    config: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Ожидать токен определенного типа
   */
  private expect(type: TokenType): boolean {
    if (this.currentToken().type === type) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Текущий токен
   */
  private currentToken(): DSLToken {
    return this.tokens[this.position] || this.tokens[this.tokens.length - 1];
  }

  /**
   * Переместиться вперед
   */
  private advance(): void {
    if (this.position < this.tokens.length) {
      this.position++;
    }
  }

  /**
   * Проверить конец файла
   */
  private isEOF(): boolean {
    return this.position >= this.tokens.length || 
           this.currentToken().type === TokenType.EOF;
  }
}
