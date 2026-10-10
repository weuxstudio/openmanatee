import { describe, expect, it } from 'vitest';
import { groesseText } from './ablage';

describe('Ablage: Groessenangaben', () => {
	it('zeigt Bytes, KB und MB mit Komma', () => {
		expect(groesseText(896)).toBe('896 B');
		expect(groesseText(8499)).toBe('8,3 KB');
		expect(groesseText(2 * 1024 * 1024)).toBe('2,0 MB');
	});

	it('gibt bei unsinnigen Werten nichts aus', () => {
		expect(groesseText(Number.NaN)).toBe('');
		expect(groesseText(-1)).toBe('');
	});
});
