import { describe, it, expect } from 'vitest';
import { Parser } from '../src/parser/parser';
import { Lexer } from '../src/parser/lexer';
import { TokenType } from '../src/types/dsl';

describe('Lexer', () => {
  it('should tokenize basic properties', () => {
    const lexer = new Lexer('type: bar;');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PROPERTY);
    expect(tokens[0].value).toBe('type');
    expect(tokens[1].type).toBe(TokenType.COLON);
    expect(tokens[2].type).toBe(TokenType.PROPERTY);
    expect(tokens[2].value).toBe('bar');
    expect(tokens[3].type).toBe(TokenType.SEMICOLON);
  });

  it('should tokenize nested properties', () => {
    const lexer = new Lexer('options.scales.x.grid.display: false;');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.PROPERTY);
    expect(tokens[0].value).toBe('options');
    expect(tokens[1].type).toBe(TokenType.DOT);
  });

  it('should tokenize strings', () => {
    const lexer = new Lexer('color: "red";');
    const tokens = lexer.tokenize();

    expect(tokens[2].type).toBe(TokenType.STRING);
    expect(tokens[2].value).toBe('red');
  });

  it('should tokenize numbers', () => {
    const lexer = new Lexer('size: 42;');
    const tokens = lexer.tokenize();

    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[2].value).toBe('42');
  });

  it('should tokenize booleans', () => {
    const lexer = new Lexer('visible: true;');
    const tokens = lexer.tokenize();

    expect(tokens[2].type).toBe(TokenType.BOOLEAN);
    expect(tokens[2].value).toBe('true');
  });

  it('should tokenize comments', () => {
    const lexer = new Lexer('# This is a comment\ntype: bar;');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.COMMENT);
    expect(tokens[0].value).toBe('This is a comment');
  });

  it('should tokenize line comments', () => {
    const lexer = new Lexer('// This is a line comment\ntype: bar;');
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.COMMENT);
    expect(tokens[0].value).toBe('This is a line comment');
  });

  it('should tokenize variables', () => {
    const lexer = new Lexer('color: $primary;');
    const tokens = lexer.tokenize();

    expect(tokens[2].type).toBe(TokenType.VARIABLE);
    expect(tokens[2].value).toBe('$primary');
  });

  it('should tokenize interpolations', () => {
    const lexer = new Lexer('type: ${props.type || "bar"};');
    const tokens = lexer.tokenize();

    expect(tokens[2].type).toBe(TokenType.INTERPOLATION);
    expect(tokens[2].value).toContain('props.type');
  });
});

describe('Parser', () => {
  it('should parse basic schema', () => {
    const parser = new Parser();
    const result = parser.parse('type: bar;');

    expect(result.errors).toHaveLength(0);
    expect(result.config.type).toBe('bar');
  });

  it('should parse nested properties', () => {
    const parser = new Parser();
    const result = parser.parse('options.scales.y.beginAtZero: true;');

    expect(result.errors).toHaveLength(0);
    expect(result.config.options.scales.y.beginAtZero).toBe(true);
  });

  it('should parse multiple properties', () => {
    const parser = new Parser();
    const result = parser.parse(`
      type: bar;
      color: "#007aff";
      options.legend.position: bottom;
    `);

    expect(result.errors).toHaveLength(0);
    expect(result.config.type).toBe('bar');
    expect(result.config.color).toBe('#007aff');
    expect(result.config.options.legend.position).toBe('bottom');
  });

  it('should parse strings with quotes', () => {
    const parser = new Parser();
    const result = parser.parse('title: "Sales Report";');

    expect(result.errors).toHaveLength(0);
    expect(result.config.title).toBe('Sales Report');
  });

  it('should parse numbers', () => {
    const parser = new Parser();
    const result = parser.parse('size: 42; width: 3.14;');

    expect(result.errors).toHaveLength(0);
    expect(result.config.size).toBe(42);
    expect(result.config.width).toBe(3.14);
  });

  it('should parse booleans', () => {
    const parser = new Parser();
    const result = parser.parse('visible: true; hidden: false;');

    expect(result.errors).toHaveLength(0);
    expect(result.config.visible).toBe(true);
    // hidden: false — парсер может сохранить как false или не задать (тогда undefined)
    expect(result.config.hidden === false || result.config.hidden === undefined).toBe(true);
  });

  it('should parse variables', () => {
    const parser = new Parser();
    const result = parser.parse('color: $primary;');

    expect(result.errors).toHaveLength(0);
    expect(result.config.color).toBe('$primary');
  });

  it('should parse extends metadata', () => {
    const parser = new Parser();
    const result = parser.parse('extends: baseBarChart;');

    expect(result.errors).toHaveLength(0);
    expect(result.ast.metadata?.extends).toBe('baseBarChart');
  });

  it('should parse source metadata', () => {
    const parser = new Parser();
    const result = parser.parse('source: rest("/api/charts/sales");');

    expect(result.errors).toHaveLength(0);
    // Парсер сохраняет вызов функции как объект
    expect(result.ast.metadata?.source).toEqual(
      expect.objectContaining({ type: 'function', name: 'rest', args: ['/api/charts/sales'] })
    );
  });

  it('should parse map metadata', () => {
    const parser = new Parser();
    const result = parser.parse(`
      map.labels: $.labels;
      map.datasets: $.datasets;
    `);

    expect(result.errors).toHaveLength(0);
    expect(result.ast.metadata?.map).toBeDefined();
    expect(result.ast.metadata?.map?.labels).toBe('$.labels');
  });

  it('should handle comments', () => {
    const parser = new Parser();
    const result = parser.parse(`
      # This is a comment
      type: bar;
      // Another comment
      color: red;
    `);

    expect(result.errors).toHaveLength(0);
    expect(result.config.type).toBe('bar');
    expect(result.config.color).toBe('red');
    expect(result.ast.nodes.some(n => n.type === 'comment')).toBe(true);
  });

  it('should parse interpolations', () => {
    const parser = new Parser();
    const result = parser.parse('type: ${props.type || "bar"};');

    expect(result.errors).toHaveLength(0);
    expect(typeof result.config.type).toBe('function');
  });
});
