# zip-folder-util

Zips a project folder while skipping `node_modules`, `dist`, `.git` — at any
depth (root or nested, e.g. `backend/node_modules`).

## Setup

```
npm install
```

## Usage

```
node zip-folder.js <sourceDir> <outputZipPath>
node zip-folder.js . build/project.zip
```

or via npm script:

```
npm run zip -- . build/project.zip
```

## Customizing what's ignored

Edit the `IGNORE_NAMES` array at the top of `zip-folder.js`:

```js
const IGNORE_NAMES = ['node_modules', 'dist', '.git'];
```

Add whatever else you want skipped, e.g. `'.next'`, `'coverage'`.

It also reads a root-level `.gitignore` (if present) and merges in any plain
folder/file names it finds. Glob patterns (`*.log`) and nested paths
(`backend/tmp`) are skipped on purpose — real gitignore-spec matching is
out of scope for this script. If you need that, swap in the `ignore` npm
package.
