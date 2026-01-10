# Project Reorganization Migration Map

## File Movements

### Next.js Application Files
| Before | After |
|--------|-------|
| `/app/*` | `/app/src/app/*` |
| `/components/*` | `/app/src/components/*` |
| `/lib/*` | `/app/src/lib/*` |
| `/contexts/*` | `/app/src/contexts/*` |
| `/hooks/*` | `/app/src/hooks/*` |
| `/types/*` | `/app/src/types/*` |
| `/middleware.ts` | `/app/src/middleware.ts` |
| `/public/*` | `/app/public/*` |
| `/database/*` | `/app/database/*` |
| `/config/*` | `/app/config/*` |
| `/scripts/*` | `/app/scripts/*` |
| `/docs/*` | `/app/docs/*` |
| `/var/*` | `/app/var/*` |
| `/.next/*` | `/app/.next/*` |
| `/package.json` | `/app/package.json` |
| `/tsconfig.json` | `/app/tsconfig.json` |
| `/next.config.js` | `/app/next.config.js` |
| `/next-env.d.ts` | `/app/next-env.d.ts` |
| `/tailwind.config.ts` | `/app/tailwind.config.ts` |
| `/postcss.config.js` | `/app/postcss.config.js` |
| `/jest.config.js` | `/app/jest.config.js` |
| `/components.json` | `/app/components.json` |
| `/.eslintrc.json` | `/app/.eslintrc.json` |
| `/.env` | `/app/.env` |
| `/.env.example` | `/app/.env.example` |
| `/verify-mock-mode.js` | `/app/verify-mock-mode.js` |
| `/.workato-ignore` | `/app/.workato-ignore` |

### Workato Files
| Before | After |
|--------|-------|
| `/workato/atomic-salesforce-recipes/*` | `/workato/recipes/atomic-salesforce-recipes/*` |
| `/workato/atomic-stripe-recipes/*` | `/workato/recipes/atomic-stripe-recipes/*` |
| `/workato/orchestrator-recipes/*` | `/workato/recipes/orchestrator-recipes/*` |
| `/workato/Workspace-Connections/*` | `/workato/recipes/Workspace-Connections/*` |
| `/projects/*` | **DELETED** (outdated duplicates, workato/ was source of truth) |

### Salesforce Files
| Before | After |
|--------|-------|
| `/salesforce/*` | `/vendor/salesforce/*` |

### Root Files (Stay at Root)
| Before | After |
|--------|-------|
| `/Makefile` | `/Makefile` |
| `/LICENSE` | `/LICENSE` |
| `/README.md` | `/README.md` |
| `/.gitignore` | `/.gitignore` |
| `/.git/*` | `/.git/*` |

## New Directories Created
- `/app/src/` - Source code container
- `/vendor/` - Third-party integrations
- `/vendor/salesforce/` - Salesforce metadata
- `/vendor/aws/cloudformation/` - AWS CloudFormation templates
- `/tools/` - Shared CLI tooling
- `/tools/bin/` - CLI wrappers
- `/docs/` - Monorepo documentation
- `/scripts/` - Monorepo-level scripts

## Import Path Updates Required

### TypeScript/JavaScript Imports
All imports in moved files need to be updated to reflect new paths:
- Components: `@/components/*` → `@/components/*` (path alias needs update in tsconfig.json)
- Lib: `@/lib/*` → `@/lib/*`
- Types: `@/types/*` → `@/types/*`
- Contexts: `@/contexts/*` → `@/contexts/*`
- Hooks: `@/hooks/*` → `@/hooks/*`

### Configuration Updates Required
1. `tsconfig.json` - Update baseUrl and paths
2. `next.config.js` - Verify paths if any
3. `tailwind.config.ts` - Update content paths
4. `jest.config.js` - Update moduleNameMapper
5. `.gitignore` - Update paths if needed
6. `Makefile` - Update all paths to app/*

## Notes
- All files will be moved, not copied
- Git history will be preserved
- Node modules will need reinstall in new location
- Database files moved to app/database
- Environment files moved to app/
