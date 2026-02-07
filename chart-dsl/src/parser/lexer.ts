import { TokenType } from '../types/dsl';
import type { DSLToken } from '../types/dsl';

/**
 * Лексер для токенизации DSL строки
 */
export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Токенизация всей входной строки
   */
  tokenize(): DSLToken[] {
    const tokens: DSLToken[] = [];

    while (!this.isEOF()) {
      this.skipWhitespace();
      if (this.isEOF()) break;

      const startPosition = this.position;
      const token = this.nextToken();
      
      // Если токен не создан и позиция не изменилась, это ошибка - выходим
      if (!token && this.position === startPosition) {
        break;
      }
      
      if (token) {
        tokens.push(token);
      }
      
      // Защита от бесконечного цикла - если создано слишком много токенов, останавливаемся
      if (tokens.length > 1000) {
        break;
      }
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column
    });

    return tokens;
  }

  /**
   * Получить следующий токен
   */
  private nextToken(): DSLToken | null {
    const char = this.currentChar();

    // Комментарии
    if (char === '#') {
      return this.readComment();
    }
    if (char === '/' && this.peekChar() === '/') {
      return this.readLineComment();
    }

    // Интерполяции
    if (char === '$' && this.peekChar() === '{') {
      return this.readInterpolation();
    }

    // Переменные темы ($primary, $secondary) или JSONPath ($.xxx)
    if (char === '$') {
      // Если следующий символ - точка, это JSONPath - создать VARIABLE("$")
      if (this.peekChar() === '.') {
        this.advance(); // Пропустить '$'
        return this.createToken(TokenType.VARIABLE, '$');
      }
      // Если следующий символ - идентификатор, это переменная темы
      if (this.isIdentifierStart(this.peekChar())) {
        return this.readVariable();
      }
      // Если только "$" без ничего, создать VARIABLE("$")
      this.advance();
      return this.createToken(TokenType.VARIABLE, '$');
    }

    // Строки
    if (char === '"' || char === "'") {
      return this.readString(char);
    }

    // Числа
    if (this.isDigit(char)) {
      return this.readNumber();
    }

    // Булевы значения
    if (this.match('true')) {
      return this.createToken(TokenType.BOOLEAN, 'true');
    }
    if (this.match('false')) {
      return this.createToken(TokenType.BOOLEAN, 'false');
    }

    // Символы
    if (char === ':') {
      this.advance();
      return this.createToken(TokenType.COLON, ':');
    }
    if (char === ';') {
      this.advance();
      return this.createToken(TokenType.SEMICOLON, ';');
    }
    if (char === '.') {
      this.advance();
      return this.createToken(TokenType.DOT, '.');
    }
    if (char === '(') {
      this.advance();
      return this.createToken(TokenType.LPAREN, '(');
    }
    if (char === ')') {
      this.advance();
      return this.createToken(TokenType.RPAREN, ')');
    }

    // Идентификаторы и свойства
    if (this.isIdentifierStart(char)) {
      return this.readIdentifier();
    }

    // Неизвестный символ - пропускаем и продолжаем
    this.advance(); // Пропустить неизвестный символ
    return null; // Вернуть null, чтобы цикл мог продолжиться
  }

  /**
   * Пропустить пробелы
   */
  private skipWhitespace(): void {
    while (!this.isEOF()) {
      const char = this.currentChar();
      if (char === '\n') {
        this.line++;
        this.column = 1;
        this.advance();
      } else if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  /**
   * Прочитать комментарий (# comment)
   */
  private readComment(): DSLToken {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // пропустить #

    let value = '';
    while (!this.isEOF() && this.currentChar() !== '\n') {
      value += this.currentChar();
      this.advance();
    }

    return {
      type: TokenType.COMMENT,
      value: value.trim(),
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Прочитать строчный комментарий (// comment)
   */
  private readLineComment(): DSLToken {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(2); // пропустить //

    let value = '';
    while (!this.isEOF() && this.currentChar() !== '\n') {
      value += this.currentChar();
      this.advance();
    }

    return {
      type: TokenType.COMMENT,
      value: value.trim(),
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Прочитать интерполяцию ${expression}
   */
  private readInterpolation(): DSLToken {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(2); // пропустить ${

    let value = '';
    let depth = 1;

    while (!this.isEOF() && depth > 0) {
      const char = this.currentChar();
      if (char === '{') depth++;
      else if (char === '}') depth--;
      
      if (depth > 0) {
        value += char;
      }
      this.advance();
    }

    return {
      type: TokenType.INTERPOLATION,
      value: value.trim(),
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Прочитать переменную темы ($primary)
   */
  private readVariable(): DSLToken {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // пропустить $

    let value = '$';
    while (!this.isEOF() && this.isIdentifierChar(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    return {
      type: TokenType.VARIABLE,
      value,
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Прочитать строку
   */
  private readString(quote: string): DSLToken {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // пропустить открывающую кавычку

    let value = '';
    while (!this.isEOF() && this.currentChar() !== quote) {
      if (this.currentChar() === '\\') {
        this.advance();
        if (this.isEOF()) break;
        const escaped = this.currentChar();
        if (escaped === 'n') value += '\n';
        else if (escaped === 't') value += '\t';
        else if (escaped === 'r') value += '\r';
        else value += escaped;
        this.advance();
      } else {
        value += this.currentChar();
        this.advance();
      }
    }

    if (!this.isEOF() && this.currentChar() === quote) {
      this.advance(); // пропустить закрывающую кавычку
    }

    return {
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Прочитать число
   */
  private readNumber(): DSLToken {
    const startLine = this.line;
    const startColumn = this.column;

    let value = '';
    while (!this.isEOF() && (this.isDigit(this.currentChar()) || this.currentChar() === '.')) {
      value += this.currentChar();
      this.advance();
    }

    return {
      type: TokenType.NUMBER,
      value,
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Прочитать идентификатор
   */
  private readIdentifier(): DSLToken {
    const startLine = this.line;
    const startColumn = this.column;

    let value = '';
    while (!this.isEOF() && this.isIdentifierChar(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    return {
      type: TokenType.PROPERTY,
      value,
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Проверить совпадение строки
   */
  private match(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
      if (this.peekChar(i) !== str[i]) {
        return false;
      }
    }
    if (this.isIdentifierChar(this.peekChar(str.length))) {
      return false;
    }
    return true;
  }

  /**
   * Создать токен
   */
  private createToken(type: TokenType, value: string): DSLToken {
    return {
      type,
      value,
      line: this.line,
      column: this.column
    };
  }

  /**
   * Текущий символ
   */
  private currentChar(): string {
    return this.input[this.position] || '';
  }

  /**
   * Посмотреть следующий символ
   */
  private peekChar(offset: number = 1): string {
    return this.input[this.position + offset] || '';
  }

  /**
   * Переместиться вперед
   */
  private advance(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.position < this.input.length) {
        this.position++;
        this.column++;
      }
    }
  }

  /**
   * Проверить конец файла
   */
  private isEOF(): boolean {
    return this.position >= this.input.length;
  }

  /**
   * Проверить начало идентификатора
   */
  private isIdentifierStart(char: string): boolean {
    return /[a-zA-Z_$]/.test(char);
  }

  /**
   * Проверить символ идентификатора
   */
  private isIdentifierChar(char: string): boolean {
    return /[a-zA-Z0-9_$]/.test(char);
  }

  /**
   * Проверить цифру
   */
  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }
}
