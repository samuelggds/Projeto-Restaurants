import { describe, expect, it } from 'vitest';
import { bearingBetweenPoints, getCourierDirectionIndex, getCourierSpriteFrame, resolveCourierHeading } from './customerTrackingMap';

describe('customerTrackingMap', () => {
  it('orienta o sprite nos oito sentidos do deslocamento real', () => {
    expect(getCourierSpriteFrame(getCourierDirectionIndex(0)).name).toBe('up');
    expect(getCourierSpriteFrame(getCourierDirectionIndex(90)).name).toBe('right');
    expect(getCourierSpriteFrame(getCourierDirectionIndex(180)).name).toBe('down');
    expect(getCourierSpriteFrame(getCourierDirectionIndex(270)).name).toBe('left');
  });

  it('prefere o heading do GPS e usa o deslocamento real como fallback', () => {
    expect(resolveCourierHeading([{ latitude: -3.73, longitude: -38.52, heading: 135 }])).toBe(135);
    const east=bearingBetweenPoints(
      { latitude: -3.73, longitude: -38.52 },
      { latitude: -3.73, longitude: -38.51 },
    );
    expect(east).toBeGreaterThan(80);
    expect(east).toBeLessThan(100);
  });
});
