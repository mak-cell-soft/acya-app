import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PHASE_COLOR_PRESETS,
  getAutomaticPhaseColor,
} from '../chantier-utils';

describe('Chantier Phase Automatic Color Assignment Tests', () => {
  const [BLUE, GREEN, AMBER, PURPLE, RED, CYAN] = PHASE_COLOR_PRESETS;

  describe('CASE 1: Zero existing phases', () => {
    it('should return the first palette color when phases array is empty', () => {
      const color = getAutomaticPhaseColor([]);
      assert.strictEqual(color, BLUE);
    });

    it('should return the first palette color when phases parameter is undefined or null', () => {
      assert.strictEqual(getAutomaticPhaseColor(undefined), BLUE);
      assert.strictEqual(getAutomaticPhaseColor(null), BLUE);
    });
  });

  describe('CASE 2: One or more existing phases (distinct selection)', () => {
    it('should select second palette color when first color is already used', () => {
      const phases = [{ color: BLUE }];
      const color = getAutomaticPhaseColor(phases);
      assert.strictEqual(color, GREEN);
    });

    it('should select third palette color when first two colors are used', () => {
      const phases = [{ color: BLUE }, { color: GREEN }];
      const color = getAutomaticPhaseColor(phases);
      assert.strictEqual(color, AMBER);
    });

    it('should select next unused palette color following palette order', () => {
      const phases = [
        { color: BLUE },
        { color: GREEN },
        { color: AMBER },
      ];
      assert.strictEqual(getAutomaticPhaseColor(phases), PURPLE);

      const phasesWithFour = [...phases, { color: PURPLE }];
      assert.strictEqual(getAutomaticPhaseColor(phasesWithFour), RED);

      const phasesWithFive = [...phasesWithFour, { color: RED }];
      assert.strictEqual(getAutomaticPhaseColor(phasesWithFive), CYAN);
    });

    it('should fill gaps if non-consecutive colors were used', () => {
      // If user had manually chosen BLUE and AMBER, GREEN is still free and should be chosen first
      const phases = [{ color: BLUE }, { color: AMBER }];
      assert.strictEqual(getAutomaticPhaseColor(phases), GREEN);
    });
  });

  describe('CASE 3: All palette colors already used (fallback & rotation)', () => {
    it('should deterministically reuse palette colors when all 6 colors are exhausted', () => {
      const allSixPhases = [
        { color: BLUE },
        { color: GREEN },
        { color: AMBER },
        { color: PURPLE },
        { color: RED },
        { color: CYAN },
      ];
      // When all are used once, minCount is 1, tie-break picks first in palette order
      const phase7Color = getAutomaticPhaseColor(allSixPhases);
      assert.strictEqual(phase7Color, BLUE);

      // Now BLUE has count 2, while other 5 have count 1
      const sevenPhases = [...allSixPhases, { color: BLUE }];
      const phase8Color = getAutomaticPhaseColor(sevenPhases);
      assert.strictEqual(phase8Color, GREEN);
    });

    it('should never fail or crash if there are dozens of phases', () => {
      const manyPhases = Array.from({ length: 50 }, (_, i) => ({
        color: PHASE_COLOR_PRESETS[i % PHASE_COLOR_PRESETS.length],
      }));
      const nextColor = getAutomaticPhaseColor(manyPhases);
      assert.ok(PHASE_COLOR_PRESETS.includes(nextColor));
    });
  });

  describe('CASE 4: Edge cases & invalid inputs', () => {
    it('should ignore deleted phases when determining used colors', () => {
      const phases = [
        { color: BLUE, isDeleted: true },
        { color: GREEN, isDeleted: false },
      ];
      // Since BLUE was deleted, BLUE is available again
      assert.strictEqual(getAutomaticPhaseColor(phases), BLUE);
    });

    it('should ignore null, undefined, or empty colors on existing phases', () => {
      const phases = [
        { color: null },
        { color: undefined },
        { color: '' },
        { color: '   ' },
      ];
      assert.strictEqual(getAutomaticPhaseColor(phases), BLUE);
    });

    it('should perform case-insensitive comparison on hex colors', () => {
      const phases = [{ color: '#2563EB' }]; // Uppercase hex
      assert.strictEqual(getAutomaticPhaseColor(phases), GREEN);
    });

    it('should ignore custom/unrecognized colors safely', () => {
      const phases = [{ color: '#999999' }]; // Custom color not in preset palette
      // First palette color is still completely free
      assert.strictEqual(getAutomaticPhaseColor(phases), BLUE);
    });
  });
});
