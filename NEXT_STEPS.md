# Next Steps After Reorganization

## Completed ✅

1. ✅ Project structure reorganized into monorepo
2. ✅ All files moved to correct locations
3. ✅ Configuration files updated (tsconfig.json, tailwind.config.ts, jest.config.js, components.json)
4. ✅ All hardcoded paths fixed in source code
5. ✅ All shell scripts updated for portability
6. ✅ Import statements verified
7. ✅ .gitignore files updated
8. ✅ README files created for all major sections
9. ✅ Migration tracking documents created

## Required Actions 🔧

### 1. Install Dependencies
```bash
cd app
npm install
```

This will install all Node.js dependencies in the new app/ directory location.

### 2. Verify Build
```bash
cd app
npm run build
```

This will compile the TypeScript and build the Next.js application to verify all imports are correct.

### 3. Test the Application
```bash
cd app
npm run dev
```

Open http://localhost:3000 and verify the application works correctly.

### 4. Run Tests
```bash
cd app
npm test
```

Verify all unit tests pass with the new structure.

### 5. Update Makefile
The root Makefile needs to be updated to reference the new `app/` directory structure. Update all commands to:
- Change working directory to `app/` before running npm commands
- Update paths to reference `app/database/`, `app/var/`, etc.

Example changes needed:
```makefile
# Before
dev:
	npm run dev

# After
dev:
	cd app && npm run dev
```

### 6. Update CI/CD Pipelines
If you have any CI/CD configuration (GitHub Actions, GitLab CI, etc.), update:
- Working directories to `app/`
- Build commands to run from `app/`
- Test commands to run from `app/`
- Deployment paths

### 7. Update Documentation
Review and update any documentation that references:
- File paths
- Directory structure
- Build/deployment commands
- Development setup instructions

### 8. Commit Changes
```bash
git add .
git commit -m "Reorganize project into monorepo structure

- Move Next.js app to app/ directory with src/ subdirectory
- Organize Workato recipes under workato/recipes/
- Move Salesforce to vendor/salesforce/
- Create infrastructure directories (vendor/aws/, tools/, docs/)
- Update all configuration files for new paths
- Fix all hardcoded paths in source code and scripts
- Update import paths and path resolution
"
```

### 9. Clean Up Old Build Artifacts
```bash
cd app
rm -rf .next
npm run build
```

This ensures the .next directory is rebuilt with correct paths.

### 10. Verify MCP Server
```bash
cd app
node src/lib/mcp/hotel-db-server.js
```

Test that the MCP server starts correctly with the new paths.

## Optional Enhancements 🚀

### 1. Add Workspace Scripts
Consider adding scripts to the root package.json for easier monorepo management:
```json
{
  "scripts": {
    "dev": "cd app && npm run dev",
    "build": "cd app && npm run build",
    "test": "cd app && npm test",
    "install:all": "cd app && npm install"
  }
}
```

### 2. Add Lerna or Nx
For better monorepo management, consider adding:
- Lerna for package management
- Nx for build orchestration
- Turborepo for caching and task running

### 3. Add Pre-commit Hooks
Set up Husky to run linting and tests before commits:
```bash
cd app
npm install --save-dev husky
npx husky install
```

### 4. Update Environment Variables
Review `.env` files and ensure all paths are correct:
- Database paths
- Log paths
- Config paths

## Verification Checklist ✓

Before considering the migration complete, verify:

- [ ] `cd app && npm install` completes successfully
- [ ] `cd app && npm run build` completes without errors
- [ ] `cd app && npm run dev` starts the development server
- [ ] Application loads at http://localhost:3000
- [ ] Login functionality works
- [ ] Guest and Manager dashboards load
- [ ] Database queries work correctly
- [ ] MCP server starts without errors
- [ ] All tests pass
- [ ] Shell scripts execute correctly
- [ ] Makefile commands work (after updating)

## Troubleshooting 🔍

### If imports fail:
1. Check `app/tsconfig.json` paths configuration
2. Verify `@/` alias resolves to `./src/*`
3. Restart TypeScript server in your IDE

### If database connection fails:
1. Verify `app/var/hotel.db` exists
2. Check `app/src/lib/db/client.ts` uses `process.cwd()`
3. Ensure working directory is `app/` when running

### If MCP server fails:
1. Check log paths use `path.join(process.cwd(), ...)`
2. Verify `app/var/logs/` directory exists
3. Check config paths resolve correctly

### If builds fail:
1. Delete `app/.next` and `app/node_modules`
2. Run `npm install` again
3. Check for any remaining hardcoded paths

## Reference Documents 📚

- `MIGRATION_MAP.md` - Before/after file locations
- `PATH_UPDATES_COMPLETE.md` - All path changes made
- `REORGANIZATION_COMPLETE.md` - Final structure overview
- `app/README.md` - Application documentation
- `workato/README.md` - Workato integration documentation
- `vendor/salesforce/README.md` - Salesforce documentation

## Support

If you encounter issues:
1. Check the reference documents above
2. Verify all paths use `process.cwd()` or `@/` aliases
3. Ensure working directory is correct when running commands
4. Review the PATH_UPDATES_COMPLETE.md for path resolution patterns
