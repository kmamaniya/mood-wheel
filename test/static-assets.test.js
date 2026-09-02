import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const assets = [
  ['index.html', 'public/index.html'],
  ['styles.css', 'public/styles.css'],
  ['src/app.js', 'public/src/app.js'],
  ['src/date.js', 'public/src/date.js'],
  ['src/moods.js', 'public/src/moods.js'],
];

test('the Worker asset directory contains the current UI files only', async () => {
  for (const [source, publishedAsset] of assets) {
    assert.equal(
      await readFile(publishedAsset, 'utf8'),
      await readFile(source, 'utf8'),
      `${publishedAsset} must match ${source}`,
    );
  }
});
